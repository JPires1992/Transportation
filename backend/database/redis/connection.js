const redis = require('redis');

async function initRedis(cfg) {
  try {
    const client = redis.createClient({
      socket: {
        host: cfg.host,
        port: cfg.port,
      },
    });

    client.on('error', (err) => console.error('Redis Client Error', err));
    client.on('connect', () => console.log('Redis connected'));

    await client.connect();

    // Default settings
    await client.set('app:name', 'TABDD - Urban Transport System');
    await client.set('app:version', '1.0.0');

    console.log('Redis connected and default settings configured');
    return client;
  } catch (error) {
    console.error('Error initializing Redis:', error);
    throw error;
  }
}

module.exports = { initRedis };

