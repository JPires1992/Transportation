const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const config = require('./config');
const { initMySQL } = require('./database/mysql/connection');
const { initRedis } = require('./database/redis/connection');
const { initMongoDB } = require('./database/mongodb/connection');
const { initNeo4j } = require('./database/neo4j/connection');
const { runSeedOnBoot } = require('./seeds');

const healthRouter = require('./routes/health');
const settingsRouter = require('./routes/settings');
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const vehiclesRouter = require('./routes/vehicles');
const notificationsRouter = require('./routes/notifications');
const cacheRouter = require('./routes/cache');
const transportationRouter = require('./routes/transportation');
const tripsRouter = require('./routes/trips');

async function buildApp() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  // Initialize database connections
  const db = await initMySQL(config.mysql);
  const cache = await initRedis(config.redis);

  // Initialize MongoDB (optional - may fail if not available)
  let mongo = null;
  try {
    mongo = await initMongoDB(config.mongodb);
  } catch (error) {
    console.log('MongoDB initialization skipped:', error.message);
  }

  // Initialize Neo4j (optional - may fail if not available)
  let neo4j = null;
  try {
    neo4j = await initNeo4j(config.neo4j);
  } catch (error) {
    console.log('Neo4j initialization skipped:', error.message);
  }

  // Expose for shutdown and other utilities
  app.locals.db = db;
  app.locals.cache = cache;
  app.locals.mongo = mongo;
  app.locals.neo4j = neo4j;

  const deps = { db, cache, mongo, neo4j };

  // Seed data on first boot (idempotent checks per database)
  await runSeedOnBoot(deps);

  // Mount routers under /api
  const api = express.Router();
  api.use(healthRouter(deps));
  api.use(settingsRouter(deps));
  api.use('/auth', authRouter(deps));
  api.use('/users', usersRouter(deps));
  api.use('/notifications', notificationsRouter(deps));
  api.use('/vehicles', vehiclesRouter(deps));
  api.use('/trips', tripsRouter(deps));
  api.use(transportationRouter(deps));
  api.use(cacheRouter(deps));
  app.use('/api', api);

  return app;
}

module.exports = { buildApp };

