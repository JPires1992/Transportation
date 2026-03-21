const VehicleRepository = require('../database/mysql/vehicleRepository');
const VehicleHistoryRepository = require('../database/mongodb/vehicleHistoryRepository');

class SimulationService {
  constructor(db, redis, mongoDb, io) {
    this.vehicleRepository = new VehicleRepository(db);
    // Only initialize MongoDB repo if mongoDb connection is available
    this.vehicleHistoryRepository = mongoDb ? new VehicleHistoryRepository(mongoDb) : null;
    this.redis = redis;
    this.io = io;
    this.isRunning = false;
    this.intervalId = null;
    
    // Center of Porto
    this.baseLat = 41.1579;
    this.baseLng = -8.6291;
    
    // Store current positions in memory to simulate continuous movement
    this.vehiclePositions = new Map();
  }

  start(intervalMs = 5000) {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('Starting vehicle simulation...');

    this.intervalId = setInterval(() => this.tick(), intervalMs);
  }

  stop() {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('Vehicle simulation stopped.');
  }

  async tick() {
    try {
      // Get active and in_service vehicles
      // We need to fetch both because the seeder sets them to 'in_service'
      // VehicleRepository filters by exact match, so we might need to update it or make two calls
      // For efficiency, let's fetch all and filter in memory, or update repo.
      // Actually, let's update the repository call to fetch both.
      // Since getAllVehicles filters by single status, let's modify the repo or just fetch all and filter.
      // Given the fleet size isn't huge, fetching all isn't terrible, but let's do it properly.
      
      // Option 1: Fetch all and filter (Simpler for now without changing repo signature deeply)
      const allVehicles = await this.vehicleRepository.getAllVehicles();
      const vehicles = allVehicles.filter(v => v.status === 'active' || v.status === 'in_service');
      
      if (vehicles.length === 0) return;

      const updates = [];
      const now = new Date();

      for (const vehicle of vehicles) {
        let pos = this.vehiclePositions.get(vehicle.id);
        
        if (!pos) {
          // Initialize position near center
          pos = {
            lat: this.baseLat + (Math.random() - 0.5) * 0.05,
            lng: this.baseLng + (Math.random() - 0.5) * 0.05
          };
        } else {
          // Move slightly (random walk)
          pos.lat += (Math.random() - 0.5) * 0.001;
          pos.lng += (Math.random() - 0.5) * 0.001;
        }
        
        this.vehiclePositions.set(vehicle.id, pos);

        // 1. Update Redis (GEOADD key longitude latitude member)
        // Note: Redis GEO uses Longitude, Latitude order
        await this.redis.geoAdd('vehicles:positions', {
          longitude: pos.lng,
          latitude: pos.lat,
          member: vehicle.id.toString()
        });

        // 2. Save History to MongoDB
        if (this.vehicleHistoryRepository) {
            // We don't await this to not block the loop, or we can await if consistency is strict
            this.vehicleHistoryRepository.createVehicleHistory({
                vehicle_id: vehicle.id,
                plate: vehicle.plate, // Denormalize plate for easier history querying
                lat: pos.lat,
                lng: pos.lng,
                status: vehicle.status,
                timestamp: now
            }).catch(err => console.error(`Failed to save history for vehicle ${vehicle.id}`, err));
        }

        // Prepare update for frontend
        updates.push({
          id: vehicle.id,
          plate: vehicle.plate,
          lat: pos.lat,
          lng: pos.lng,
          type: vehicle.type
        });
      }

      // Broadcast updates
      this.io.emit('vehicle_update', updates);
      
      // Optional: Log occasional updates
      // console.log(`Simulated movement for ${updates.length} vehicles`);
      
    } catch (error) {
      console.error('Simulation tick error:', error);
    }
  }
}

module.exports = SimulationService;
