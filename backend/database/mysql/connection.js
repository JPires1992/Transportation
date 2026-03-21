const mysql = require('mysql2/promise');

async function initSchema(pool) {
  try {
    // Users table with password_hash, phone, and role
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        phone VARCHAR(20),
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('admin', 'passenger') DEFAULT 'passenger',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Attempt to add role column if it doesn't exist (for existing tables)
    try {
      await pool.execute(`
        ALTER TABLE users ADD COLUMN role ENUM('admin', 'passenger') DEFAULT 'passenger'
      `);
      console.log('Added role column to users table');
    } catch (err) {
      // Ignore error if column already exists (Code 1060: Duplicate column name)
      if (err.code !== 'ER_DUP_FIELDNAME') {
        // Log other errors but don't fail initialization
        console.warn('Note: Could not add role column (might already exist):', err.message);
      }
    }

    // Vehicles table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS vehicles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        plate VARCHAR(20) NOT NULL UNIQUE,
        type VARCHAR(50) NOT NULL,
        capacity INT NOT NULL,
        status ENUM('active', 'inactive', 'maintenance', 'in_service') DEFAULT 'inactive',
        route_id VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_status (status),
        INDEX idx_type (type),
        INDEX idx_route_id (route_id),
        INDEX idx_status_type (status, type)
      )
    `);

    // Attempt to add idx_status_type index if it doesn't exist (for existing tables)
    try {
      await pool.execute(`
        CREATE INDEX idx_status_type ON vehicles (status, type)
      `);
      console.log('Added idx_status_type index to vehicles table');
    } catch (err) {
      // Ignore error if index already exists (Code 1061: Duplicate key name)
      if (err.code !== 'ER_DUP_KEYNAME') {
        // Log other errors but don't fail initialization
        console.warn('Note: Could not add idx_status_type index (might already exist):', err.message);
      }
    }

    console.log('MySQL database tables initialized');
  } catch (error) {
    console.error('Error initializing database schema:', error);
    throw error;
  }
}

async function initMySQL(cfg) {
  const pool = mysql.createPool({
    host: cfg.host,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
    waitForConnections: cfg.waitForConnections,
    connectionLimit: cfg.connectionLimit,
    queueLimit: cfg.queueLimit,
  });

  console.log('MySQL connection pool created');
  await initSchema(pool);
  return pool;
}

module.exports = { initMySQL };

