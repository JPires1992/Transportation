const { Router } = require('express');
const RouteRepository = require('../database/neo4j/routeRepository');
const UserRepository = require('../database/mysql/userRepository');
const SessionRepository = require('../database/redis/sessionRepository');
const { authenticate } = require('../middleware/auth');

const HISTORY_PREFIX = 'routes:plan:history:user:';
const HISTORY_MAX = 10;

module.exports = ({ neo4j, cache, db }) => {
  const router = Router();
  const routeRepository = neo4j ? new RouteRepository(neo4j) : null;
  const historyStore = cache || null;
  const userRepository = db ? new UserRepository(db) : null;
  const sessionRepository = cache ? new SessionRepository(cache) : null;
  const authMiddleware = userRepository && sessionRepository
    ? authenticate(userRepository, sessionRepository)
    : (req, res) => res.status(503).json({ error: 'Auth not available' });

  const ensureNeo4j = (res) => {
    if (!routeRepository) {
      res.status(503).json({ error: 'Neo4j not available' });
      return false;
    }
    return true;
  };

  // Redis cache check
  const ensureCache = (res) => {
    if (!historyStore) {
      res.status(503).json({ error: 'Cache not available' });
      return false;
    }
    return true;
  };

  // GET /lines - list bus lines
  router.get('/lines', async (req, res) => {
    if (!ensureNeo4j(res)) return;
    try {
      const lines = await routeRepository.listLines();
      res.json({ lines });
    } catch (error) {
      console.error('List lines error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // GET /lines/:id - line details
  router.get('/lines/:id', async (req, res) => {
    if (!ensureNeo4j(res)) return;
    try {
      const line = await routeRepository.getRouteById(req.params.id);
      if (!line) {
        return res.status(404).json({ error: 'Line not found' });
      }
      res.json({ line });
    } catch (error) {
      console.error('Get line error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // GET /lines/:id/stops - itinerary for a line
  router.get('/lines/:id/stops', async (req, res) => {
    if (!ensureNeo4j(res)) return;
    try {
      const stops = await routeRepository.getRouteStops(req.params.id);
      if (stops === null) {
        return res.status(404).json({ error: 'Line not found' });
      }
      res.json({ line_id: req.params.id, stops });
    } catch (error) {
      console.error('Get line stops error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // GET /stops - list stops
  router.get('/stops', async (req, res) => {
    if (!ensureNeo4j(res)) return;
    try {
      const stops = await routeRepository.listStops();
      res.json({ stops });
    } catch (error) {
      console.error('List stops error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // GET /stops/:id - stop info
  router.get('/stops/:id', async (req, res) => {
    if (!ensureNeo4j(res)) return;
    try {
      const stop = await routeRepository.getStopById(req.params.id);
      if (!stop) {
        return res.status(404).json({ error: 'Stop not found' });
      }
      res.json({ stop });
    } catch (error) {
      console.error('Get stop error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /*
   * Helper routes to call Neo4j methods that return only IDs
  */
     // GET /lines/all/ids - list line ids only
  router.get('/lines/all/ids', async (req, res) => {
    if (!ensureNeo4j(res)) return;
    try {
      const ids = await routeRepository.listRouteIds();
      res.json({ ids });
    } catch (error) {
      console.error('List line ids error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // GET /stops/all/ids - list stop ids only
  router.get('/stops/all/ids', async (req, res) => {
    if (!ensureNeo4j(res)) return;
    try {
      const ids = await routeRepository.listStopIds();
      res.json({ ids });
    } catch (error) {
      console.error('List stop ids error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // GET /stops/all/ids/name - list stop ids with names
  router.get('/stops/all/ids/name', async (req, res) => {
    if (!ensureNeo4j(res)) return;
    try {
      const stops = await routeRepository.listStopIdsWithName();
      res.json({ stops });
    } catch (error) {
      console.error('List stop ids+name error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // GET /routes/plan - compute optimized path between two stops
  router.get('/routes/plan', authMiddleware, async (req, res) => {
    if (!ensureNeo4j(res)) return;
    const { origin, destination } = req.query;
    const rawMaxHops = Number(req.query.max_hops || req.query.maxHops || 0);
    const maxDepth = Number.isFinite(rawMaxHops) && rawMaxHops > 0
      ? Math.min(Math.floor(rawMaxHops), 200)
      : 50;

    if (!origin || !destination) {
      return res.status(400).json({ error: 'Origin and destination query parameters are required' });
    }

    try {
      const result = await routeRepository.findShortestPath(origin, destination, { maxDepth });
      const originStop = result.origin;
      const destinationStop = result.destination;

      if (!originStop) {
        return res.status(404).json({ error: 'Origin stop not found' });
      }
      if (!destinationStop) {
        return res.status(404).json({ error: 'Destination stop not found' });
      }
      if (!result.path) {
        return res.status(404).json({ error: 'No path found between the specified stops' });
      }

      const plan = {
        requested_at: new Date().toISOString(),
        max_hops: maxDepth,
        origin: originStop,
        destination: destinationStop,
        hops: result.path.hops,
        stops: result.path.stops,
        segments: result.path.segments,
      };

      // Route change count (whenever segment route changes)
      const routeChanges = plan.segments.reduce((changes, seg, idx, arr) => {
        if (idx === 0) return 0;
        const prev = arr[idx - 1];
        return seg.route !== prev.route ? changes + 1 : changes;
      }, 0);

      plan.route_changes = routeChanges;
      plan.stop_count = plan.stops.length;
      plan.segment_count = plan.segments.length;

      // Store history asynchronously per user; do not fail the request if cache is down
      if (historyStore && req.user) {
        const historyKey = `${HISTORY_PREFIX}${req.user.id}`;
        const entry = {
          at: plan.requested_at,
          origin: { id: originStop.id, name: originStop.name },
          destination: { id: destinationStop.id, name: destinationStop.name },
          hops: plan.hops,
          stop_count: plan.stop_count,
          segment_count: plan.segment_count,
        };
        try {
          await historyStore.lPush(historyKey, JSON.stringify(entry));
          await historyStore.lTrim(historyKey, 0, HISTORY_MAX - 1);
        } catch (err) {
          console.warn('Failed to persist route plan history:', err.message || err);
        }
      }

      res.json({ plan });
    } catch (error) {
      console.error('Route plan error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // GET /routes/plan/history - list previous route plan queries (using cache)
  router.get('/routes/plan/history', authMiddleware, async (req, res) => {
    if (!ensureCache(res)) return;
    try {
      const historyKey = `${HISTORY_PREFIX}${req.user.id}`;
      const rawItems = await historyStore.lRange(historyKey, 0, HISTORY_MAX - 1);
      const history = rawItems
        .map((item) => {
          try {
            return JSON.parse(item);
          } catch (err) {
            return null;
          }
        })
        .filter(Boolean);
      res.json({ history });
    } catch (error) {
      console.error('Route plan history error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};
