const neo4j = require('neo4j-driver');
const Route = require('../../models/route');
const Stop = require('../../models/stop');

// #Region Auxiliary Functions
function toNativeInt(value) {
  return neo4j.isInt(value) ? value.toNumber() : value;
}

function mapRoute(route) {
  if (!route) return null;
  return Route.fromNeo({
    ...route,
    stopCount: toNativeInt(route.stopCount),
  });
}

function mapStop(stop) {
  if (!stop) return null;
  return Stop.fromNeo({
    ...stop,
    order: toNativeInt(stop.order ?? null),
    time: stop.time ?? null,
  });
}


function parseTimeToSeconds(time) {
  if (!time || typeof time !== 'string') return null;
  const match = time.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  const s = Number(match[3] ?? 0);
  if ([h, m, s].some((v) => Number.isNaN(v))) return null;
  return h * 3600 + m * 60 + s;
}

function formatSecondsToTime(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const h = String(Math.floor(safe / 3600) % 24).padStart(2, '0');
  const m = String(Math.floor((safe % 3600) / 60)).padStart(2, '0');
  const s = String(safe % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function normalizeSegmentTimes(segments, defaultStartSeconds = 6 * 3600, minStepSeconds = 180) {
  if (!Array.isArray(segments) || segments.length === 0) return [];
  let currentSeconds = parseTimeToSeconds(segments[0].time);
  if (currentSeconds === null) currentSeconds = defaultStartSeconds;

  return segments.map((seg, idx) => {
    const parsed = parseTimeToSeconds(seg.time);
    if (parsed !== null && parsed >= currentSeconds) {
      currentSeconds = parsed;
      return { ...seg, time: formatSecondsToTime(parsed) };
    }

    // If time is missing or goes backwards, synthesize a forward step
    currentSeconds = idx === 0 ? currentSeconds : currentSeconds + minStepSeconds;
    return { ...seg, time: formatSecondsToTime(currentSeconds) };
  });
}
// #EndRegion 


//#region RouteRepository with Neo4j methods
class RouteRepository {
  constructor(driver) {
    this.driver = driver;
  }

  /*
  *  Async function to list all routes with their details and stop counts
  */
  async listLines() {
    const session = this.driver.session();
    try {
      const result = await session.executeRead((tx) =>
        tx.run(`
          MATCH (r:Route)
          OPTIONAL MATCH (r)-[:BELONGS_TO]->(s:Stop)
          WITH r, count(s) as stopCount
          RETURN {
            id: r.id,
            name: r.name,
            number: r.number,
            active: coalesce(r.active, true),
            schedule: r.schedule,
            stopCount: stopCount
          } AS route
          ORDER BY route.number
        `)
      );
      return result.records.map((record) => mapRoute(record.get('route')));
    } finally {
      await session.close();
    }
  }

  /*
  *  Async function to get a route by its ID with details and stop count
  */
  async getRouteById(routeId) {
    const session = this.driver.session();
    try {
      const result = await session.executeRead((tx) =>
        tx.run(
          `
            MATCH (r:Route {id: $id})
            OPTIONAL MATCH (r)-[:BELONGS_TO]->(s:Stop)
            WITH r, count(s) as stopCount
            RETURN {
              id: r.id,
              name: r.name,
              number: r.number,
              active: coalesce(r.active, true),
              schedule: r.schedule,
              stopCount: stopCount
            } AS route
            LIMIT 1
          `,
          { id: routeId }
        )
      );
      if (result.records.length === 0) return null;
      return mapRoute(result.records[0].get('route'));
    } finally {
      await session.close();
    }
  }

  /*
  *  Async function to get stops for a specific route by route ID
  */
  async getRouteStops(routeId) {
    const session = this.driver.session();

    try {
      const result = await session.executeRead((tx) =>
        tx.run(
          `
            MATCH (r:Route {id: $id})-[rel:BELONGS_TO]->(s:Stop)
            RETURN {
              id: s.id,
              name: s.name,
              type: s.type,
              zone: s.zone,
              latitude: s.latitude,
              longitude: s.longitude,
              order: rel.order,
              time: rel.time
            } AS stop
            ORDER BY rel.order ASC
          `,
          { id: routeId }
        )
      );

      if (result.records.length === 0) return null;
      let stops = result.records.map((rec) => mapStop(rec.get('stop'))).filter(Boolean);

      if (!stops.length) {
        // verify existence
        const existsResult = await session.executeRead((tx) =>
          tx.run(
            `
              MATCH (r:Route {id: $id})
              RETURN count(r) as count
            `,
            { id: routeId }
          )
        );
        const count = existsResult.records[0].get('count');
        if (neo4j.isInt(count) ? count.toNumber() === 0 : count === 0) {
          return null;
        }
      }

      return stops;
    } finally {
      await session.close();
    }
  }

  /*
  *  Async function to check if a route exists by its ID
  */
  async routeExists(routeId) {
    const session = this.driver.session();
    try {
      const result = await session.executeRead((tx) =>
        tx.run(
          `
            MATCH (r:Route {id: $id})
            RETURN count(r) as count
          `,
          { id: routeId }
        )
      );
      const count = result.records[0].get('count');
      return neo4j.isInt(count) ? count.toNumber() > 0 : count > 0;
    } finally {
      await session.close();
    }
  }

  /*
  * Async function to list all stops with their details and associated routes
  */
  async listStops() {
    const session = this.driver.session();
    try {
      const result = await session.executeRead((tx) =>
        tx.run(`
          MATCH (s:Stop)
          OPTIONAL MATCH (r:Route)-[:BELONGS_TO]->(s)
          WITH s, collect(distinct r.id) as routeIds
          RETURN {
            id: s.id,
            name: s.name,
            type: s.type,
            zone: s.zone,
            latitude: s.latitude,
            longitude: s.longitude,
            routes: routeIds
          } AS stop
          ORDER BY s.name
        `)
      );
      return result.records.map((record) => mapStop(record.get('stop')));
    } finally {
      await session.close();
    }
  }

 /* 
 *  Async function to get a stop by its ID with details and associated routes
 */
  async getStopById(stopId) {
    const session = this.driver.session();
    try {
      const result = await session.executeRead((tx) =>
        tx.run(
          `
            MATCH (s:Stop {id: $id})
            OPTIONAL MATCH (r:Route)-[:BELONGS_TO]->(s)
            WITH s, collect(distinct r.id) as routeIds
            RETURN {
              id: s.id,
              name: s.name,
              type: s.type,
              zone: s.zone,
              latitude: s.latitude,
              longitude: s.longitude,
              routes: routeIds
            } AS stop
            LIMIT 1
          `,
          { id: stopId }
        )
      );
      if (result.records.length === 0) return null;
      return mapStop(result.records[0].get('stop'));
    } finally {
      await session.close();
    }
  }

  /*
  *  Find the shortest path between two stops using BELONGS_TO (topology and schedule)
  */
  async findShortestPath(originId, destinationId, { maxDepth = 50 } = {}) {
    const session = this.driver.session();
    const toNumber = (v) => (neo4j.isInt(v) ? v.toNumber() : v);

    try {
      // Load routes in 3 sets: 
      // (1) routes with either stop,
      // (2) routes with both stops, 
      // (3) routes sharing stops with the previous ones (1 hop expansion)
      const result = await session.executeRead((tx) =>
        tx.run(
          `
            MATCH (r:Route)-[:BELONGS_TO]->(s:Stop)
            WHERE s.id IN [$originId, $destinationId]
            WITH collect(distinct r) AS seedRoutes

            OPTIONAL MATCH (r2:Route)-[:BELONGS_TO]->(:Stop {id: $originId})
            WHERE EXISTS {
              MATCH (r2)-[:BELONGS_TO]->(:Stop {id: $destinationId})
            }
            WITH seedRoutes, collect(distinct r2) AS bothStopsRoutes
            WITH seedRoutes + bothStopsRoutes AS coreRoutes

            UNWIND coreRoutes AS coreRoute
            OPTIONAL MATCH (coreRoute)-[:BELONGS_TO]->(shared:Stop)<-[:BELONGS_TO]-(r3:Route)
            WITH coreRoutes, collect(distinct r3) AS expandedRoutes
            WITH coreRoutes + expandedRoutes AS allRoutes

            UNWIND allRoutes AS route
            MATCH (route)-[rel:BELONGS_TO]->(stop:Stop)
            RETURN DISTINCT route.id AS route, rel.order AS ord, rel.time AS time, stop AS stop
          `,
          { originId, destinationId }
        )
      );

      if (!result.records.length) return { origin: null, destination: null, path: null };

      const stopMap = new Map(); // stopId -> stop
      const stopTimes = new Map(); // key route|order -> time
      const routeSequences = new Map(); // route -> [{stopId, order, time}]

      result.records.forEach((rec) => {
        const route = rec.get('route');
        const ord = toNumber(rec.get('ord'));
        const time = rec.get('time');
        const stopNode = rec.get('stop');
        const stopId = stopNode.properties.id;

        if (!stopMap.has(stopId)) {
          stopMap.set(
            stopId,
            mapStop({
              id: stopId,
              name: stopNode.properties.name,
              type: stopNode.properties.type,
              zone: stopNode.properties.zone,
              latitude: stopNode.properties.latitude,
              longitude: stopNode.properties.longitude,
            })
          );
        }

        stopTimes.set(`${route}|${ord}`, time);
        if (!routeSequences.has(route)) routeSequences.set(route, []);
        routeSequences.get(route).push({ stopId, order: ord, time, route });
      });

      // Adjacencies derived from stop order
      const adjacency = new Map(); // stopId -> [{to, route, fromOrder, toOrder, time}]
      routeSequences.forEach((list) => {
        const sorted = list.sort((a, b) => a.order - b.order);
        for (let i = 0; i < sorted.length - 1; i += 1) {
          const cur = sorted[i];
          const nxt = sorted[i + 1];
          if (!adjacency.has(cur.stopId)) adjacency.set(cur.stopId, []);
          adjacency.get(cur.stopId).push({
            to: nxt.stopId,
            route: cur.route,
            fromOrder: cur.order,
            toOrder: nxt.order,
            time: nxt.time,
          });
        }
      });

      // BFS for the shortest number of hops (respecting maxDepth)
      const queue = [{ id: originId, depth: 0 }];
      const visited = new Set([originId]);
      const parent = new Map(); // stopId -> {prev, edge}

      while (queue.length && !visited.has(destinationId)) {
        const { id: current, depth } = queue.shift();
        if (depth >= maxDepth) continue;
        const neighbors = adjacency.get(current) || [];
        for (const edge of neighbors) {
          if (!visited.has(edge.to)) {
            visited.add(edge.to);
            parent.set(edge.to, { prev: current, edge });
            queue.push({ id: edge.to, depth: depth + 1 });
            if (edge.to === destinationId) break;
          }
        }
      }

      if (!visited.has(destinationId)) {
        return { origin: stopMap.get(originId) || null, destination: stopMap.get(destinationId) || null, path: null };
      }

      // Reconstruct path
      const pathStops = [];
      const pathSegments = [];
      let cursor = destinationId;
      while (cursor !== originId) {
        const entry = parent.get(cursor);
        pathStops.push(cursor);
        pathSegments.push(entry.edge);
        cursor = entry.prev;
      }
      pathStops.push(originId);
      pathStops.reverse();
      pathSegments.reverse();

      // Assign times in route order; if any time is before the previous, the path is not feasible
      const stopsWithTimes = [];
      const DAY_SECONDS = 24 * 3600;
      let prevSeconds = null;

      for (let i = 0; i < pathStops.length; i += 1) {
        const stopId = pathStops[i];
        const stop = stopMap.get(stopId);
        let order = null;
        let time = null;

        if (i === 0 && pathSegments.length) {
          order = pathSegments[0].fromOrder ?? null;
          time = stopTimes.get(`${pathSegments[0].route}|${order}`) || stop?.time || null;
        } else if (i > 0) {
          const seg = pathSegments[i - 1];
          order = seg.toOrder ?? null;
          time = stopTimes.get(`${seg.route}|${order}`) || seg.time || stop?.time || null;
        }

        let seconds = parseTimeToSeconds(time);
        if (prevSeconds !== null && seconds !== null && seconds < prevSeconds) {
          // path not feasible at current time
          return { origin: stopMap.get(originId) || null, destination: stopMap.get(destinationId) || null, path: null };
        }
        if (seconds !== null) prevSeconds = seconds;

        stopsWithTimes.push(mapStop({ ...stop, order, time }));
      }

      // Segments aligned with the path
      const segments = pathSegments.map((seg, idx) => ({
        from: pathStops[idx],
        to: seg.to,
        route: seg.route,
        order: seg.toOrder,
        time: seg.time,
      }));
      const normalizedSegments = normalizeSegmentTimes(
        segments,
        parseTimeToSeconds(stopsWithTimes[0]?.time ?? null) ?? 6 * 3600,
        300
      );

      return {
        origin: stopsWithTimes[0] || stopMap.get(originId) || null,
        destination: stopsWithTimes[stopsWithTimes.length - 1] || stopMap.get(destinationId) || null,
        path: {
          hops: Math.max(0, stopsWithTimes.length - 1),
          stops: stopsWithTimes,
          segments: normalizedSegments,
        },
      };
    } finally {
      await session.close();
    }
  }

  // Helper methods to list all route IDs and stop IDs
  /*
  *  Async function to list all route IDs
  */
  async listRouteIds() {
    const session = this.driver.session();
    try {
      const result = await session.executeRead((tx) =>
        tx.run(
          `
            MATCH (r:Route)
            RETURN r.id AS id
            ORDER BY r.id
          `
        )
      );
      return result.records.map((r) => r.get('id'));
    } finally {
      await session.close();
    }
  }

  /*
  *  Async function to list all stop IDs
  */
  async listStopIds() {
    const session = this.driver.session();
    try {
      const result = await session.executeRead((tx) =>
        tx.run(
          `
            MATCH (s:Stop)
            RETURN s.id AS id
            ORDER BY s.id
          `
        )
      );
      return result.records.map((r) => r.get('id'));
    } finally {
      await session.close();
    }
  }

  /*
  *  Async function to list all stop IDs with names
  */
  async listStopIdsWithName() {
    const session = this.driver.session();
    try {
      const result = await session.executeRead((tx) =>
        tx.run(
          `
            MATCH (s:Stop)
            RETURN { id: s.id, name: s.name } AS stop
            ORDER BY s.name
          `
        )
      );
      return result.records.map((r) => r.get('stop'));
    } finally {
      await session.close();
    }
  }
  
}

module.exports = RouteRepository;
