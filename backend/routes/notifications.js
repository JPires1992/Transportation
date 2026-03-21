const { Router } = require('express');
const UserRepository = require('../database/mysql/userRepository');
const SessionRepository = require('../database/redis/sessionRepository');
const UserPreferencesRepository = require('../database/mongodb/userPreferencesRepository');
const { authenticate } = require('../middleware/auth');

module.exports = ({ db, cache, mongo }) => {
  const router = Router();
  const userRepository = new UserRepository(db);
  const sessionRepository = new SessionRepository(cache);
  const userPreferencesRepository = mongo ? new UserPreferencesRepository(mongo.db) : null;

  const ensureMongo = (res) => {
    if (!userPreferencesRepository) {
      res.status(503).json({ error: 'MongoDB not available' });
      return false;
    }
    return true;
  };

  // GET /notifications/:userId - list active notifications for the user (protected)
  router.get('/:userId', authenticate(userRepository, sessionRepository), async (req, res) => {
    if (!ensureMongo(res)) return;
    try {
      const userId = parseInt(req.params.userId, 10);
      if (Number.isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid user id' });
      }
      if (req.user.id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const notifications = await userPreferencesRepository.listActiveNotifications(userId);
      res.json({ notifications });
    } catch (error) {
      console.error('List notifications error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};
