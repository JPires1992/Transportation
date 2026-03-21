const { Router } = require('express');
const UserRepository = require('../database/mysql/userRepository');
const SessionRepository = require('../database/redis/sessionRepository');
const UserPreferencesRepository = require('../database/mongodb/userPreferencesRepository');
const RouteRepository = require('../database/neo4j/routeRepository');
const { authenticate } = require('../middleware/auth');

module.exports = ({ db, cache, mongo, neo4j }) => {
  const router = Router();
  const userRepository = new UserRepository(db);
  const sessionRepository = new SessionRepository(cache);
  const userPreferencesRepository = mongo ? new UserPreferencesRepository(mongo.db) : null;
  const routeRepository = neo4j ? new RouteRepository(neo4j) : null;

  // GET /users/:id - Get user profile (protected)
  router.get('/:id', authenticate(userRepository, sessionRepository), async (req, res) => {
    try {
      const { id } = req.params;
      const userId = parseInt(id);

      // Users can only view their own profile (or admin can view any)
      if (req.user.id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const user = await userRepository.findUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ user: user.toJSON() });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  //#region MongoDB methods for user preferences
  const ensureMongo = (res) => {
    if (!userPreferencesRepository) {
      res.status(503).json({ error: 'MongoDB not available' });
      return false;
    }
    return true;
  };

  const ensureNeo4jForFavorites = (res) => {
    if (!routeRepository) {
      res.status(503).json({ error: 'Neo4j not available for favorites validation' });
      return false;
    }
    return true;
  };

  const sanitizeStringArray = (value) => {
    if (value === undefined) return undefined;
    if (!Array.isArray(value)) return null;
    return value
      .map((item) => String(item).trim())
      .filter((item) => item.length > 0);
  };

  // GET /users/me/preferences/notification - get notification preferences (protected)
  router.get('/me/preferences/notification', authenticate(userRepository, sessionRepository), async (req, res) => {
    if (!ensureMongo(res)) return;
    try {
      const prefs = await userPreferencesRepository.getByUserId(req.user.id);
      res.json({
        notification_preferences: {
          user_id: prefs.userId,
          notify_route_changes: prefs.notifyRouteChanges,
          notify_eta: prefs.notifyEta,
          created_at: prefs.createdAt,
          updated_at: prefs.updatedAt,
        },
      });
    } catch (error) {
      console.error('Get notification preferences error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // POST /users/me/preferences/notification - create or update notification preferences (protected)
  router.post('/me/preferences/notification', authenticate(userRepository, sessionRepository), async (req, res) => {
    if (!ensureMongo(res)) return;
    try {
      const { notify_route_changes, notify_eta } = req.body;
      if (notify_route_changes === undefined && notify_eta === undefined) {
        return res.status(400).json({ error: 'At least one preference field is required' });
      }
      if (notify_route_changes !== undefined && typeof notify_route_changes !== 'boolean') {
        return res.status(400).json({ error: 'notify_route_changes must be a boolean' });
      }
      if (notify_eta !== undefined && typeof notify_eta !== 'boolean') {
        return res.status(400).json({ error: 'notify_eta must be a boolean' });
      }

      const prefs = await userPreferencesRepository.updateNotificationSettings(req.user.id, {
        notifyRouteChanges: notify_route_changes,
        notifyEta: notify_eta,
      });
      res.status(201).json({
        notification_preferences: {
          user_id: req.user.id,
          notify_route_changes: prefs.notifyRouteChanges,
          notify_eta: prefs.notifyEta,
          created_at: prefs.createdAt,
          updated_at: prefs.updatedAt,
        },
      });
    } catch (error) {
      console.error('Create/update notification preferences error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // GET /users/me/favorites - get favorites (protected)
  router.get('/me/favorites', authenticate(userRepository, sessionRepository), async (req, res) => {
    if (!ensureMongo(res)) return;
    try {
      const prefs = await userPreferencesRepository.getByUserId(req.user.id);
      res.json({
        favorites: {
          user_id: prefs.userId,
          favorite_routes: prefs.favoriteRoutes,
          favorite_stops: prefs.favoriteStops,
          created_at: prefs.createdAt,
          updated_at: prefs.updatedAt,
        },
      });
    } catch (error) {
      console.error('Get favorites error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // POST /users/me/favorites - create/replace favorites (protected)
  router.post('/me/favorites', authenticate(userRepository, sessionRepository), async (req, res) => {
    if (!ensureMongo(res)) return;
    if (!ensureNeo4jForFavorites(res)) return;
    try {
      const favoriteRoutes = sanitizeStringArray(req.body.favorite_routes);
      const favoriteStops = sanitizeStringArray(req.body.favorite_stops);
      if (favoriteRoutes === null || favoriteStops === null) {
        return res.status(400).json({ error: 'favorite_routes and favorite_stops must be arrays of strings' });
      }
      if (favoriteRoutes === undefined && favoriteStops === undefined) {
        return res.status(400).json({ error: 'At least one favorites field is required' });
      }

      // Validate favorite routes against Neo4j data
      if (favoriteRoutes !== undefined) {
        const validRouteIds = new Set(await routeRepository.listRouteIds());
        const invalidRoutes = favoriteRoutes.filter((r) => !validRouteIds.has(r));
        if (invalidRoutes.length) {
          return res.status(400).json({ error: 'Invalid favorite_routes', invalid_routes: invalidRoutes });
        }
      }

      // Validate favorite stops against Neo4j data
      if (favoriteStops !== undefined) {
        const validStopIds = new Set(await routeRepository.listStopIds());
        const invalidStops = favoriteStops.filter((s) => !validStopIds.has(s));
        if (invalidStops.length) {
          return res.status(400).json({ error: 'Invalid favorite_stops', invalid_stops: invalidStops });
        }
      }

      const prefs = await userPreferencesRepository.updateFavorites(req.user.id, {
        favoriteRoutes,
        favoriteStops,
      });
      res.status(201).json({
        favorites: {
          user_id: prefs.userId,
          favorite_routes: prefs.favoriteRoutes,
          favorite_stops: prefs.favoriteStops,
          created_at: prefs.createdAt,
          updated_at: prefs.updatedAt,
        },
      });
    } catch (error) {
      console.error('Create/update favorites error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  
  // GET /users/me/feedback - get feedback (protected)
  router.get('/me/feedback', authenticate(userRepository, sessionRepository), async (req, res) => {
    if (!ensureMongo(res)) return;
    try {
      const prefs = await userPreferencesRepository.getByUserId(req.user.id);
      res.json({
        feedback: {
          user_id: prefs.userId,
          feedback_score: prefs.feedbackScore,
          feedback_text: prefs.feedbackText,
          created_at: prefs.createdAt,
          updated_at: prefs.updatedAt,
        },
      });
    } catch (error) {
      console.error('Get feedback error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // POST /users/me/feedback - create/replace feedback (protected)
  router.post('/me/feedback', authenticate(userRepository, sessionRepository), async (req, res) => {
    if (!ensureMongo(res)) return;
    try {
      const { feedback_score, feedback_text } = req.body;
      if (feedback_score === undefined && feedback_text === undefined) {
        return res.status(400).json({ error: 'At least one feedback field is required' });
      }
      // score between 1 and 5
      if (feedback_score !== undefined && (typeof feedback_score !== 'number' || !Number.isFinite(feedback_score) || feedback_score < 1 || feedback_score > 5)) {
        return res.status(400).json({ error: 'feedback_score must be a number between 1 and 5' });
      }
      if (feedback_text !== undefined && typeof feedback_text !== 'string') {
        return res.status(400).json({ error: 'feedback_text must be a string' });
      }



      const prefs = await userPreferencesRepository.saveFeedback(req.user.id, {
        feedbackScore: feedback_score,
        feedbackText: feedback_text,
      });
      res.status(201).json({
        feedback: {
          user_id: prefs.userId,
          feedback_score: prefs.feedbackScore,
          feedback_text: prefs.feedbackText,
          created_at: prefs.createdAt,
          updated_at: prefs.updatedAt,
        },
      });
    } catch (error) {
      console.error('Create/update feedback error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  //#endregion MongoDB

  return router;
};
