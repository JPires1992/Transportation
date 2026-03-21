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
  console.log('       MYSQL BENCHMARK (Complex Query)   ');
  console.log('=========================================');

  const conn = await mysql.createConnection(dbConfig);
  const COUNT = 10000000;

  try {
    // 1. Setup Table
    console.log('Setting up benchmark table...');
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS bench_bookings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        vehicle_id INT,
        status VARCHAR(20),
        booking_date DATE,
        amount DECIMAL(10,2),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Truncate to start fresh
    await conn.execute('TRUNCATE TABLE bench_bookings');

    // 2. Seed Data
    console.log(`Seeding ${COUNT} records (this may take a moment)...`);
    const batchSize = 2000;
    let values = [];
    
    // Helper for bulk insert
    const insertBatch = async (vals) => {
      if (vals.length === 0) return;
      const placeholders = vals.map(() => '(?, ?, ?, ?, ?)').join(',');
      const flatValues = vals.flat();
      await conn.execute(
        `INSERT INTO bench_bookings (user_id, vehicle_id, status, booking_date, amount) VALUES ${placeholders}`,
        flatValues
      );
    };

    const statuses = ['pending', 'confirmed', 'cancelled', 'completed'];
    
    for (let i = 0; i < COUNT; i++) {
      const userId = Math.floor(Math.random() * 1000);
      const vehicleId = Math.floor(Math.random() * 100);
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const date = new Date(Date.now() - Math.floor(Math.random() * 10000000000)); // Random past date
      const amount = (Math.random() * 50).toFixed(2);

      values.push([userId, vehicleId, status, date, amount]);

      if (values.length >= batchSize) {
        await insertBatch(values);
        values = [];
        process.stdout.write(`\rSeeded ${i + 1} / ${COUNT}`);
      }
    }
    await insertBatch(values);
    console.log('\nSeeding complete.');

    // 3. Ensure NO indexes (drop if exists)
    try { await conn.execute('DROP INDEX idx_search_opt ON bench_bookings'); } catch(e) {}

    // 4. Define the "Slow" Query
    // Scenario: Find total revenue from 'confirmed' bookings for a specific vehicle within a date range
    const querySql = `
      SELECT SUM(amount) as total_revenue, COUNT(*) as count 
      FROM bench_bookings 
      WHERE vehicle_id = ? 
      AND status = 'confirmed' 
      AND booking_date BETWEEN ? AND ?
    `;
    const params = [42, '2023-01-01', '2025-12-31'];

    // 5. Run Unindexed Benchmark
    console.log('\n--- Scenario: Revenue Report for Vehicle #42 (Confirmed, 2023-2025) ---');
    console.log('Running Unindexed Query (Full Table Scan)...');
    
    const startUn = process.hrtime();
    // Run multiple times to get average? Or just once for clear 'cold' difference. 
    // We'll run once to simulate a heavy ad-hoc report.
    const [rowsUn] = await conn.execute(querySql, params);
    const endUn = process.hrtime(startUn);
    const timeUn = (endUn[0] * 1000 + endUn[1] / 1e6).toFixed(2);
    
    console.log(`Result: $${rowsUn[0].total_revenue || 0} from ${rowsUn[0].count} bookings`);
    console.log(`Time: ${timeUn} ms`);

    // 6. Apply Optimization
    console.log('\nApplying Composite Index (vehicle_id, status, booking_date)...');
    const startIdxBuild = process.hrtime();
    await conn.execute('CREATE INDEX idx_search_opt ON bench_bookings (vehicle_id, status, booking_date)');
    const endIdxBuild = process.hrtime(startIdxBuild);
    console.log(`Index built in ${(endIdxBuild[0] * 1000 + endIdxBuild[1] / 1e6).toFixed(2)} ms`);

    // 7. Run Indexed Benchmark
    console.log('Running Indexed Query (Range Scan)...');
    const startIdx = process.hrtime();
    const [rowsIdx] = await conn.execute(querySql, params);
    const endIdx = process.hrtime(startIdx);
    const timeIdx = (endIdx[0] * 1000 + endIdx[1] / 1e6).toFixed(2);

    console.log(`Result: $${rowsIdx[0].total_revenue || 0} from ${rowsIdx[0].count} bookings`);
    console.log(`Time: ${timeIdx} ms`);

    // 8. Report
    const speedup = (timeUn / timeIdx).toFixed(2);
    console.log(`\n> Optimization Speedup: ${speedup}x`);

    // Cleanup
    await conn.execute('DROP TABLE bench_bookings');

  } catch (err) {
    console.error('MySQL Benchmark Failed:', err);
  } finally {
    await conn.end();
  }
}

benchmarkMySQL();

