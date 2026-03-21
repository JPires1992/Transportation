const { Router } = require('express');

module.exports = ({ cache }) => {
  const router = Router();

  router.get('/cache/stats', async (req, res) => {
    try {
      const info = await cache.info('stats');
      const dbSize = await cache.dbSize();
      res.json({ dbSize, info });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.delete('/cache/clear', async (req, res) => {
    try {
      await cache.flushDb();
      await cache.set('app:name', 'TABDD - Test All Bases Database Demo');
      await cache.set('app:version', '1.0.0');
      await cache.set('app:max_users', '1000');
      res.json({ message: 'Cache cleared and defaults restored' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};

