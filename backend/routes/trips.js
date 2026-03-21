const { Router } = require('express');
const UserHistoryRepository = require('../database/mongodb/userHistoryRepository');
const UserRepository = require('../database/mysql/userRepository');
const SessionRepository = require('../database/redis/sessionRepository');
const { authenticate } = require('../middleware/auth');

module.exports = ({ db, cache, mongo }) => {
  const router = Router();
  const userHistoryRepository = mongo ? new UserHistoryRepository(mongo.db) : null;
  const userRepository = new UserRepository(db);
  const sessionRepository = new SessionRepository(cache);

  const ensureMongo = (res) => {
    if (!userHistoryRepository) {
      res.status(503).json({ error: 'MongoDB not available' });
      return false;
    }
    return true;
  };

  // GET /trips/stats - user trip statistics (protected)
  router.get('/stats', authenticate(userRepository, sessionRepository), async (req, res) => {
    if (!ensureMongo(res)) return;
    try {
      const stats = await userHistoryRepository.getUserStats(req.user.id);
      // Convert durations from milliseconds to minutes for the API consumer
      const toMinutes = (ms) => (ms === null || ms === undefined ? null : ms / 60000);
      const statsMinutes = {
        user_id: stats.user_id,
        trip_count: stats.trip_count,
        total_duration_minutes: toMinutes(stats.total_duration_ms),
        avg_duration_minutes: toMinutes(stats.avg_duration_ms),
        last_trip_started_at: stats.last_trip_started_at,
        last_trip_ended_at: stats.last_trip_ended_at,
      };

      res.json({ stats: statsMinutes });
    } catch (error) {
      console.error('Get trip stats error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // GET /trips/:id - trip details (protected)
  router.get('/:id', authenticate(userRepository, sessionRepository), async (req, res) => {
    if (!ensureMongo(res)) return;
    try {
      const trip = await userHistoryRepository.getTripById(req.params.id, req.user.id);
      if (!trip) {
        return res.status(404).json({ error: 'Trip not found' });
      }
      res.json({ trip: trip.toJSON() });
    } catch (error) {
      console.error('Get trip error:', error);
      if (error.name === 'BSONTypeError') {
        return res.status(400).json({ error: 'Invalid trip id' });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // GET /trips - list user trips (protected)
  router.get('/', authenticate(userRepository, sessionRepository), async (req, res) => {
    if (!ensureMongo(res)) return;
    try {
      const trips = await userHistoryRepository.listUserTrips(req.user.id);
      res.json({ trips: trips.map((t) => t.toJSON()) });
    } catch (error) {
      console.error('List trips error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};
