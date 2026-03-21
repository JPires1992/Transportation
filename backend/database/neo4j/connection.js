const neo4j = require('neo4j-driver');

// Initialize Neo4j schema: constraints and indexes
async function initSchema(driver) {
  const session = driver.session();
  try {
    await session.executeWrite(async (tx) => {
      await tx.run(`
        CREATE CONSTRAINT stop_id_unique IF NOT EXISTS
        FOR (s:Stop) REQUIRE s.id IS UNIQUE
      `);
      await tx.run(`
        CREATE CONSTRAINT route_id_unique IF NOT EXISTS
        FOR (r:Route) REQUIRE r.id IS UNIQUE
      `);
    });

    console.log('Neo4j schema initialized');
  } finally {
    await session.close();
  }
}

// Initialize Neo4j connection (seeding handled elsewhere)
async function initNeo4j(cfg) {
  const maxAttempts = Number(cfg.maxAttempts) || 10;
  const delayMs = Number(cfg.retryDelayMs) || 2000;

  const driver = neo4j.driver(cfg.uri, neo4j.auth.basic(cfg.user, cfg.password));

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`Attempting Neo4j connectivity (attempt ${attempt}/${maxAttempts}) to ${cfg.uri}`);
      await driver.verifyConnectivity();
      await initSchema(driver);
      console.log('Neo4j connected');
      return driver;
    } catch (error) {
      const isLast = attempt === maxAttempts;
      console.error(`Neo4j connectivity attempt ${attempt} failed:`, error.message || error);
      if (isLast) {
        console.log('Neo4j connection failed after retries - continuing without Neo4j');
        try {
          await driver.close();
        } catch (e) {
          // ignore
        }
        return null;
      }

      // wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

module.exports = { initNeo4j };
