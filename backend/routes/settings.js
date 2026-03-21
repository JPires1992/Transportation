const { Router } = require('express');

module.exports = ({ cache }) => {
  const router = Router();

  router.get('/settings', async (req, res) => {
    try {
      const keys = await cache.keys('app:*');
      const settings = {};

      for (const key of keys) {
        const value = await cache.get(key);
        settings[key.replace('app:', '')] = value;
      }

      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/settings', async (req, res) => {
    try {
      const { key, value } = req.body;
      await cache.set(`app:${key}`, value);
      res.json({ message: 'Setting saved', key, value });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};

