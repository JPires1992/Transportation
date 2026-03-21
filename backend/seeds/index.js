const bcrypt = require('bcrypt');
const neo4j = require('neo4j-driver');
const { loadStcpDataset } = require('./stcpDataset');
const https = require('https');

const USE_STCP_API = process.env.SEED_USE_STCP_API !== 'false';
const STCP_LINES = [
  '200', '201', '202', '203', '204', '205', '206', '207', '208', '209',
  '300', '301', '302', '303', '304', '305',
  '400', '401', '402', '403', '404',
  '500', '501', '502',
];
const DEFAULT_USER_COUNT = Number(process.env.SEED_USER_COUNT || 500);
const TRIPS_PER_USER = {
  min: Number(process.env.SEED_TRIPS_MIN || 20),
  max: Number(process.env.SEED_TRIPS_MAX || 30),
};
const SEED_PASSWORD = process.env.SEED_USER_PASSWORD || 'Pass1234';

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomItem = (arr) => arr[randomInt(0, arr.length - 1)];

function toNumber(value) {
  return neo4j.isInt(value) ? value.toNumber() : value;
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          res.resume();
          return;
        }
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (err) {
            reject(err);
          }
        });
      })
      .on('error', reject)
      .setTimeout(15000, function () {
        this.destroy(new Error('Request timeout'));
      });
  });
}

function pad2(n) {
  return n.toString().padStart(2, '0');
}

function addMinutes(base, minutes) {
  const d = new Date(base.getTime() + minutes * 60000);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:00`;
}

async function fetchStopsForLine(lineNumber) {
  const directions = [0, 1];
  const variants = [];

  for (const dir of directions) {
    try {
      const data = await fetchJson(`https://stcp.pt/api/route/${lineNumber}/stops/direction?direction_id=${dir}`);
      const stops = Array.isArray(data.stops) ? data.stops : [];
      if (stops.length) variants.push(stops);
    } catch (err) {
      // ignore missing directions
    }
  }

  if (!variants.length) throw new Error(`No stops for line ${lineNumber}`);
  variants.sort((a, b) => b.length - a.length);
  const stops = variants[0];
  const base = new Date();
  base.setHours(6, 0, 0, 0);
  const normalized = stops
    .map((s, idx) => ({
      id: String(s.stop_id),
      name: s.stop_name,
      type: 'regular',
      zone: s.zone_id || null,
      latitude: s.stop_lat ?? null,
      longitude: s.stop_lon ?? null,
      order: s.stop_sequence ?? idx + 1,
      time: addMinutes(base, idx * 3),
    }))
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const first = normalized[0]?.name || '';
  const last = normalized[normalized.length - 1]?.name || '';
  const name = `Linha ${lineNumber}: ${first} - ${last}`;

  return {
    id: `STCP-${lineNumber}`,
    number: lineNumber,
    name,
    active: true,
    schedule: '06:00-23:30',
    stops: normalized,
  };
}

async function fetchStcpDatasetFromApi() {
  const lines = [];
  const stopsMap = new Map();
  for (const num of STCP_LINES) {
    const line = await fetchStopsForLine(num);
    lines.push(line);
    line.stops.forEach((s) => {
      if (!stopsMap.has(s.id)) stopsMap.set(s.id, { ...s });
    });
  }
  return { lines, stops: Array.from(stopsMap.values()), fallback: false };
}

async function seedNeo4jRoutes(driver, dataset) {
  if (!driver) return;
  const session = driver.session();
  try {
    const countResult = await session.executeRead((tx) =>
      tx.run('MATCH (r:Route) RETURN count(r) as count')
    );
    const count = toNumber(countResult.records[0].get('count'));
    if (count > 0) {
      console.log(`Neo4j seed skipped (routes already present: ${count})`);
      return;
    }

    const lines = dataset.lines || [];
    console.log(`Seeding Neo4j with ${lines.length} STCP lines...`);

    await session.executeWrite(async (tx) => {
      for (const stop of dataset.stops) {
        await tx.run(
          `
            MERGE (s:Stop {id: $id})
            SET s.name = $name,
                s.type = $type,
                s.zone = $zone,
                s.latitude = $latitude,
                s.longitude = $longitude
          `,
          stop
        );
      }

      for (let routeIndex = 0; routeIndex < lines.length; routeIndex += 1) {
        const route = lines[routeIndex];
        await tx.run(
          `
            MERGE (r:Route {id: $id})
            SET r.name = $name,
                r.number = $number,
                r.active = $active,
                r.schedule = $schedule
          `,
          {
            id: route.id,
            name: route.name,
            number: route.number,
            active: route.active,
            schedule: route.schedule,
          }
        );

        const sortedStops = [...route.stops].sort((a, b) => (a.order || 0) - (b.order || 0));

        // Deterministic schedules: each line starts at 06:00 + (index * 30m); reverse starts after trip + 10 min
        const intervalMinutes = 5;
        const startMinutes = 360 + routeIndex * 30; // 06:00 base + 30m offset per route
        const totalSpan = (sortedStops.length - 1) * intervalMinutes;
        const reverseStartMinutes = startMinutes + totalSpan + 10; // +10 min buffer at terminal

        const toTime = (minutes) => {
          const hh = String(Math.floor(minutes / 60) % 24).padStart(2, '0');
          const mm = String(minutes % 60).padStart(2, '0');
          return `${hh}:${mm}:00`;
        };

        const forwardTimes = sortedStops.map((_, idx) => toTime(startMinutes + idx * intervalMinutes));
        const forwardOrders = sortedStops.map((_, idx) => idx + 1);
        const reverseOrderBase = forwardOrders.length; // reverse orders continue after forward

        // BELONGS_TO forward and reverse
        for (let i = 0; i < sortedStops.length; i += 1) {
          const stopRef = sortedStops[i];
          const forwardOrder = forwardOrders[i];
          const forwardTime = forwardTimes[i];

          const reverseOrder = reverseOrderBase + (sortedStops.length - i); // ensure reverse orders ascend with reverse times
          const reverseTime = toTime(reverseStartMinutes + (sortedStops.length - 1 - i) * intervalMinutes);

          // BELONGS_TO forward
          await tx.run(
            `
              MATCH (r:Route {id: $routeId}), (s:Stop {id: $stopId})
              MERGE (r)-[rel:BELONGS_TO {direction: 'forward', stop_id: $stopId}]->(s)
              SET rel.order = $order,
                  rel.time = $time
            `,
            {
              routeId: route.id,
              stopId: stopRef.id,
              order: forwardOrder,
              time: forwardTime,
            }
          );

          // BELONGS_TO reverse
          await tx.run(
            `
              MATCH (r:Route {id: $routeId}), (s:Stop {id: $stopId})
              MERGE (r)-[rel:BELONGS_TO {direction: 'reverse', stop_id: $stopId}]->(s)
              SET rel.order = $order,
                  rel.time = $time
            `,
            {
              routeId: route.id,
              stopId: stopRef.id,
              order: reverseOrder,
              time: reverseTime,
            }
          );
        }
      }
    });

    console.log('Neo4j seed completed');
  } finally {
    await session.close();
  }
}

async function seedMySQLUsers(db, userCount = DEFAULT_USER_COUNT) {
  if (!db) return;
  
  // 1. Ensure Admin User Exists
  const [adminRows] = await db.execute('SELECT id FROM users WHERE email = ?', ['admin@example.com']);
  if (adminRows.length === 0) {
    console.log('Seeding Admin user (admin@example.com / admin)...');
    const adminHash = await bcrypt.hash('admin', 10);
    await db.execute(
      'INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      ['System Admin', 'admin@example.com', '123456789', adminHash, 'admin']
    );
  } else {
    console.log('Admin user already exists.');
  }

  // 2. Seed Regular Users
  const [rows] = await db.execute('SELECT COUNT(*) as count FROM users');
  const count = rows[0]?.count || 0;
  // If we have more than just the admin (count > 1), skip seeding
  if (count > 1) {
    console.log(`MySQL seed skipped (users already present: ${count})`);
    return;
  }

  console.log(`Seeding MySQL with ${userCount} users...`);
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  const users = [];
  for (let i = 1; i <= userCount; i += 1) {
    const padded = String(i).padStart(3, '0');
    const name = `User${padded}`;
    const email = `user${padded}@example.com`;
    users.push([name, email, null, passwordHash]);
  }

  const chunkSize = 200;
  for (let offset = 0; offset < users.length; offset += chunkSize) {
    const chunk = users.slice(offset, offset + chunkSize);
    const placeholders = chunk.map(() => '(?, ?, ?, ?)').join(', ');
    const flat = chunk.flat();
    await db.execute(
      `INSERT INTO users (name, email, phone, password_hash) VALUES ${placeholders}`,
      flat
    );
  }
  console.log('MySQL seed completed');
}

async function seedMySQLVehicles(db, dataset) {
  if (!db) return;
  const [rows] = await db.execute('SELECT COUNT(*) as count FROM vehicles');
  const count = rows[0]?.count || 0;
  if (count > 0) {
    console.log(`MySQL vehicles seed skipped (vehicles already present: ${count})`);
    return;
  }

  const lines = dataset.lines || [];
  if (!lines.length) {
    console.warn('MySQL vehicles seed skipped: no routes available to attach vehicles');
    return;
  }

  const vehicles = [];
  for (const line of lines) {
    const perLine = randomInt(2, 4);
    for (let i = 1; i <= perLine; i += 1) {
      const plate = `STCP-${line.number || line.id}-${String(i).padStart(2, '0')}`.toUpperCase();
      const status = Math.random() < 0.85 ? 'in_service' : 'maintenance';
      const capacity = randomInt(60, 90);
      vehicles.push([plate, 'bus', capacity, status, line.id]);
    }
  }

  console.log(`Seeding MySQL with ${vehicles.length} vehicles attached to routes...`);
  const chunkSize = 200;
  for (let offset = 0; offset < vehicles.length; offset += chunkSize) {
    const chunk = vehicles.slice(offset, offset + chunkSize);
    const placeholders = chunk.map(() => '(?, ?, ?, ?, ?)').join(', ');
    const flat = chunk.flat();
    await db.execute(
      `INSERT INTO vehicles (plate, type, capacity, status, route_id) VALUES ${placeholders}`,
      flat
    );
  }
  console.log('MySQL vehicles seed completed');
}

function buildHelpers(lines) {
  const linesWithStops = lines.filter((l) => Array.isArray(l.stops) && l.stops.length > 1);
  const allStops = linesWithStops.flatMap((l) => l.stops);
  const stopIds = allStops.map((s) => s.id);
  const routeIds = linesWithStops.map((l) => l.id);
  return { linesWithStops, allStops, stopIds, routeIds };
}

function generateTripsForUser(userId, helpers) {
  const trips = [];
  const tripCount = randomInt(TRIPS_PER_USER.min, TRIPS_PER_USER.max);

  for (let i = 0; i < tripCount; i += 1) {
    const line = randomItem(helpers.linesWithStops);
    const sortedStops = [...line.stops].sort((a, b) => (a.order || 0) - (b.order || 0));
    const originIdx = randomInt(0, sortedStops.length - 2);
    const destIdx = randomInt(originIdx + 1, sortedStops.length - 1);
    const origin = sortedStops[originIdx];
    const destination = sortedStops[destIdx];

    // Random time within last 45 days
    const start = new Date(Date.now() - randomInt(1, 45) * 24 * 60 * 60 * 1000);
    start.setHours(randomInt(5, 22), randomInt(0, 59), 0, 0);
    const hopMinutes = Math.max(6, (destIdx - originIdx) * randomInt(4, 9));
    const end = new Date(start.getTime() + hopMinutes * 60000);

    trips.push({
      user_id: userId,
      route_id: line.id,
      origin: { stop_id: origin.id, name: origin.name },
      destination: { stop_id: destination.id, name: destination.name },
      started_at: start,
      ended_at: end,
      duration_ms: end - start,
    });
  }

  return trips;
}

function generatePreferencesForUser(userId, helpers) {
  const favoriteRoutes = [];
  const routesPickCount = Math.min(helpers.routeIds.length, randomInt(2, 6));
  while (favoriteRoutes.length < routesPickCount) {
    const candidate = randomItem(helpers.routeIds);
    if (!favoriteRoutes.includes(candidate)) favoriteRoutes.push(candidate);
  }

  const favoriteStops = [];
  const stopsPickCount = Math.min(helpers.stopIds.length, randomInt(3, 8));
  while (favoriteStops.length < stopsPickCount) {
    const candidate = randomItem(helpers.stopIds);
    if (!favoriteStops.includes(candidate)) favoriteStops.push(candidate);
  }

  const notifyRouteChanges = Math.random() < 0.35;
  const notifyEta = Math.random() < 0.35;
  const feedbackScore = Math.random() < 0.25 ? randomInt(3, 5) : null;
  const feedbackText = feedbackScore
    ? ['Good service', 'On time', 'Could be cleaner'][randomInt(0, 2)]
    : null;

  const now = new Date();
  return {
    user_id: userId,
    favorite_routes: favoriteRoutes,
    favorite_stops: favoriteStops,
    notify_route_changes: notifyRouteChanges,
    notify_eta: notifyEta,
    feedback_score: feedbackScore,
    feedback_text: feedbackText,
    created_at: now,
    updated_at: now,
  };
}

async function seedMongoUserData(db, dataset, userCount = DEFAULT_USER_COUNT) {
  if (!db) return;
  const userHistory = db.collection('user_history');
  const userPreferences = db.collection('user_preferences');

  const [historyCount, prefsCount] = await Promise.all([
    userHistory.estimatedDocumentCount(),
    userPreferences.estimatedDocumentCount(),
  ]);

  if (historyCount > 0 || prefsCount > 0) {
    console.log(
      `Mongo seed skipped (history: ${historyCount} docs, preferences: ${prefsCount} docs)`
    );
    return;
  }

  const helpers = buildHelpers(dataset.lines || []);
  if (!helpers.linesWithStops.length) {
    console.warn('Mongo seed skipped: no routes with stops available');
    return;
  }

  console.log(
    `Seeding MongoDB with ${userCount} users -> preferences + ${TRIPS_PER_USER.min}-${TRIPS_PER_USER.max} trips each...`
  );

  const allTrips = [];
  const prefsDocs = [];

  for (let userId = 1; userId <= userCount; userId += 1) {
    allTrips.push(...generateTripsForUser(userId, helpers));
    prefsDocs.push(generatePreferencesForUser(userId, helpers));
  }

  // Insert in chunks to avoid large batches
  const chunkSize = 2000;
  for (let offset = 0; offset < allTrips.length; offset += chunkSize) {
    const chunk = allTrips.slice(offset, offset + chunkSize);
    await userHistory.insertMany(chunk, { ordered: false });
  }
  await userPreferences.insertMany(prefsDocs, { ordered: false });

  console.log(
    `Mongo seed completed (history docs: ${allTrips.length}, preferences docs: ${prefsDocs.length})`
  );
}

async function runSeedOnBoot(deps) {
  const seedEnabled = process.env.SEED_ON_BOOT !== 'false';
  if (!seedEnabled) {
    console.log('Seed on boot disabled via SEED_ON_BOOT=false');
    return;
  }

  let dataset = null;
  if (USE_STCP_API) {
    try {
      console.log('Fetching STCP dataset from API...');
      dataset = await fetchStcpDatasetFromApi();
    } catch (err) {
      console.warn('STCP API fetch failed, falling back to bundled dataset:', err.message || err);
    }
  }

  if (!dataset) {
    dataset = loadStcpDataset();
    if (dataset.fallback) {
      console.warn('Using fallback STCP sample dataset (static).');
    }
  }

  await seedNeo4jRoutes(deps.neo4j, dataset);
  await seedMySQLUsers(deps.db);
  await seedMySQLVehicles(deps.db, dataset);
  await seedMongoUserData(deps.mongo?.db, dataset);
}

module.exports = { runSeedOnBoot };
