const mysql = require('mysql2/promise');
const config = require('../config');

// Configuration for the benchmark
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'tabdd_user',
  password: process.env.DB_PASSWORD || 'tabdd_pass',
  database: process.env.DB_NAME || 'tabdd',
  multipleStatements: true
};

async function benchmarkMySQL() {
  console.log('\n=========================================');
  console.log('       MYSQL BENCHMARK (Real Scenario)   ');
  console.log('=========================================');

  const conn = await mysql.createConnection(dbConfig);
  const COUNT = 100000;

  try {
    // 1. Setup Benchmark Table (Mirror of real vehicles table)
    console.log('Setting up benchmark table (bench_vehicles)...');
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS bench_vehicles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        plate VARCHAR(20) NOT NULL,
        type VARCHAR(50) NOT NULL,
        capacity INT NOT NULL,
        status ENUM('active', 'inactive', 'maintenance', 'in_service') DEFAULT 'inactive',
        route_id VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    await conn.execute('TRUNCATE TABLE bench_vehicles');

    // 2. Seed Data
    console.log(`Seeding ${COUNT} vehicles...`);
    const batchSize = 2000;
    let values = [];
    
    const statuses = ['active', 'inactive', 'maintenance', 'in_service'];
    const types = ['bus', 'minibus', 'tram', 'metro'];

    // Helper for bulk insert
    const insertBatch = async (vals) => {
      if (vals.length === 0) return;
      const placeholders = vals.map(() => '(?, ?, ?, ?, ?)').join(',');
      const flatValues = vals.flat();
      await conn.execute(
        `INSERT INTO bench_vehicles (plate, type, capacity, status, route_id) VALUES ${placeholders}`,
        flatValues
      );
    };
    
    for (let i = 0; i < COUNT; i++) {
      const plate = `AA-${i}-${Math.floor(Math.random()*99)}`;
      const type = types[Math.floor(Math.random() * types.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const capacity = 50 + Math.floor(Math.random() * 100);
      const routeId = Math.random() > 0.5 ? `route_${Math.floor(Math.random() * 20)}` : null;

      values.push([plate, type, capacity, status, routeId]);

      if (values.length >= batchSize) {
        await insertBatch(values);
        values = [];
        process.stdout.write(`\rSeeded ${i + 1} / ${COUNT}`);
      }
    }
    await insertBatch(values);
    console.log('\nSeeding complete.');

    // 3. Ensure NO indexes initially (except Primary)
    try { await conn.execute('DROP INDEX idx_status_type ON bench_vehicles'); } catch(e) {}
    try { await conn.execute('DROP INDEX idx_status ON bench_vehicles'); } catch(e) {}
    try { await conn.execute('DROP INDEX idx_type ON bench_vehicles'); } catch(e) {}

    // 4. The Query (Matches VehicleRepository.getAllVehicles with filters)
    // Scenario: Find all 'active' 'bus' vehicles
    const querySql = `SELECT * FROM bench_vehicles WHERE status = ? AND type = ?`;
    const params = ['active', 'bus'];

    // 5. Run Unindexed Benchmark
    console.log('\n--- Scenario: Filter by Status="active" AND Type="bus" ---');
    console.log('Running Unindexed Query (Full Table Scan)...');
    
    const startUn = process.hrtime();
    const [rowsUn] = await conn.execute(querySql, params);
    const endUn = process.hrtime(startUn);
    const timeUn = (endUn[0] * 1000 + endUn[1] / 1e6).toFixed(2);
    
    console.log(`Result: Found ${rowsUn.length} vehicles`);
    console.log(`Time: ${timeUn} ms`);

    // 6. Apply Optimization (Composite Index)
    console.log('\nApplying Composite Index (status, type)...');
    const startIdxBuild = process.hrtime();
    await conn.execute('CREATE INDEX idx_status_type ON bench_vehicles (status, type)');
    const endIdxBuild = process.hrtime(startIdxBuild);
    console.log(`Index built in ${(endIdxBuild[0] * 1000 + endIdxBuild[1] / 1e6).toFixed(2)} ms`);

    // 7. Run Indexed Benchmark
    console.log('Running Indexed Query (Composite Index Scan)...');
    const startIdx = process.hrtime();
    const [rowsIdx] = await conn.execute(querySql, params);
    const endIdx = process.hrtime(startIdx);
    const timeIdx = (endIdx[0] * 1000 + endIdx[1] / 1e6).toFixed(2);

    console.log(`Result: Found ${rowsIdx.length} vehicles`);
    console.log(`Time: ${timeIdx} ms`);

    // 8. Report
    const speedup = (timeUn / timeIdx).toFixed(2);
    console.log(`\n> Optimization Speedup: ${speedup}x`);

    // Cleanup
    await conn.execute('DROP TABLE bench_vehicles');

  } catch (err) {
    console.error('MySQL Benchmark Failed:', err);
  } finally {
    await conn.end();
  }
}

benchmarkMySQL();
