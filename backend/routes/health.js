const { Router } = require('express');

module.exports = ({ db, cache, mongo, neo4j }) => {
  const router = Router();

  router.get('/health', async (req, res) => {
    try {
      const [mysqlResult] = await db.execute('SELECT 1');
      const redisPing = await cache.ping();

      const health = {
        status: 'ok',
        mysql: mysqlResult ? 'connected' : 'disconnected',
        redis: redisPing === 'PONG' ? 'connected' : 'disconnected',
      };

      // Check MongoDB if available
      if (mongo) {
        try {
          await mongo.db.admin().ping();
          health.mongodb = 'connected';
        } catch (error) {
          health.mongodb = 'disconnected';
        }
      } else {
        health.mongodb = 'not_initialized';
      }

      // Check Neo4j if available
      if (neo4j) {
        try {
          await neo4j.verifyConnectivity();
          health.neo4j = 'connected';
        } catch (error) {
          health.neo4j = 'disconnected';
        }
      } else {
        health.neo4j = 'not_initialized';
      }

      res.json(health);
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  });

  return router;
};

