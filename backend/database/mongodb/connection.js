const { MongoClient } = require('mongodb');

async function initUserHistory(db) {
  try {
    // Ensure the database exists. MongoDB creates a database only when a
    // collection or document is created, so if the DB has no collections yet
    // we create a small marker collection and remove it afterwards.
    const dbName = db.databaseName || 'tabdd';
    const existingCollections = await db.listCollections({}, { nameOnly: true }).toArray();
    if (existingCollections.length === 0) {
      try {
        await db.createCollection('__init_marker');
        await db.collection('__init_marker').insertOne({ createdAt: new Date() });
        await db.collection('__init_marker').drop();
        console.log(`MongoDB: created marker collection to ensure database ${dbName} exists`);
      } catch (e) {
        console.warn('MongoDB: could not create marker collection', e.message || e);
      }
    } else {
      console.log(`MongoDB: database ${dbName} already has collections`);
    }

    // Create user_history collection if not exists in the database
    const existing = await db.listCollections({ name: 'user_history' }, { nameOnly: true }).toArray();
    if (!existing.length) {
      await db.createCollection('user_history');
      console.log('MongoDB: created collection user_history');
    }

    // Create indexes for optimized queries
    try {
      await db.collection('user_history').createIndex(
        { user_id: 1, started_at: -1 },
        { name: 'idx_user_startedAt_desc' }
      );
      console.log('MongoDB: created index idx_user_startedAt_desc on user_history');
    } catch (err) {
      console.warn('MongoDB: could not create index idx_user_startedAt_desc', err.message || err);
    }

    console.log('MongoDB user_history collection ready');
  } catch (err) {
    console.warn('MongoDB: failed to ensure user_history collection', err.message || err);
  }
}

async function initUserPreferences(db) {
  try {
    const existing = await db.listCollections({ name: 'user_preferences' }, { nameOnly: true }).toArray();
    if (!existing.length) {
      await db.createCollection('user_preferences');
      console.log('MongoDB: created collection user_preferences');
    }
    await db.collection('user_preferences').createIndex(
      { user_id: 1 },
      { unique: true, name: 'user_preferences_user_id_unique' }
    );

    console.log('MongoDB user_preferences collection ready');
  } catch (err) {
    console.warn('MongoDB: failed to ensure user_preferences collection', err.message || err);
  }
}


async function initMongoDB(cfg) {
  try {
    // Connection URI with authentication
    const uri = `mongodb://${cfg.username}:${cfg.password}@${cfg.host}:${cfg.port}/${cfg.database}?authSource=admin`;
    const client = new MongoClient(uri);
    // Connect to MongoDB
    await client.connect();
    console.log('MongoDB connected');
    const db = client.db(cfg.database);

    // Ensure user_history collection exists or create it
    await initUserHistory(db);
    await initUserPreferences(db);
    console.log('MongoDB schema initialized');    
    return { client, db };
  } catch (error) {
    console.error('Error initializing MongoDB:', error);
    console.log('MongoDB connection failed - continuing without MongoDB');
    return null;
  }
}

module.exports = { initMongoDB };
