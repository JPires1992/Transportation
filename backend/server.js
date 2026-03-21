const { buildApp } = require('./app');
const { port } = require('./config');

async function start() {
  try {
    const app = await buildApp();

    const server = app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });

    // Initialize Socket.io
    const { Server } = require('socket.io');
    const SimulationService = require('./services/simulationService'); // Import SimulationService

    const io = new Server(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });
    
    app.locals.io = io;

    // Start Simulation Service
    // app.locals.mongo.db is the database instance from initMongoDB
    const mongoDb = app.locals.mongo ? app.locals.mongo.db : null;
    const simulationService = new SimulationService(app.locals.db, app.locals.cache, mongoDb, io);
    simulationService.start(3000); // Update every 3 seconds

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });

    const shutdown = async () => {
      console.log('Shutdown signal received, closing connections...');
      try {
        simulationService.stop(); // Stop simulation
        if (app.locals && app.locals.cache) await app.locals.cache.quit();
        if (app.locals && app.locals.db) await app.locals.db.end();
        if (app.locals && app.locals.mongo && app.locals.mongo.client) {
          await app.locals.mongo.client.close();
        }
        if (app.locals && app.locals.neo4j) {
          await app.locals.neo4j.close();
        }
      } catch (err) {
        console.error('Error during shutdown:', err);
      } finally {
        server.close(() => process.exit(0));
      }
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

start();

