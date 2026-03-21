const PORT = process.env.PORT || 3000;

const mysql = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'tabdd_user',
  password: process.env.DB_PASSWORD || 'tabdd_pass',
  database: process.env.DB_NAME || 'tabdd',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

const redis = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
};

const mongodb = {
  host: process.env.MONGO_HOST || 'localhost',
  port: Number(process.env.MONGO_PORT || 27017),
  database: process.env.MONGO_DATABASE || 'tabdd',
  username: process.env.MONGO_USERNAME || 'mongo_user',
  password: process.env.MONGO_PASSWORD || 'mongo_pass',
};

const neo4j = {
  uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
  user: process.env.NEO4J_USER || 'neo4j',
  password: process.env.NEO4J_PASSWORD || 'neo4j_pass',
  maxAttempts: process.env.NEO4J_MAX_ATTEMPTS || undefined,
  retryDelayMs: process.env.NEO4J_RETRY_DELAY_MS || undefined,
};

const jwt = {
  secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  expiresIn: process.env.JWT_EXPIRES_IN || '24h',
};

module.exports = {
  port: PORT,
  mysql,
  redis,
  mongodb,
  neo4j,
  jwt,
};

