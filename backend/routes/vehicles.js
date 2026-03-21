const { Router } = require('express');
const VehicleRepository = require('../database/mysql/vehicleRepository');
const UserRepository = require('../database/mysql/userRepository');
const SessionRepository = require('../database/redis/sessionRepository');
const { authenticate, authorize } = require('../middleware/auth');

module.exports = ({ db, cache }) => {
  const router = Router();
  const vehicleRepository = new VehicleRepository(db);
  const userRepository = new UserRepository(db);
  const sessionRepository = new SessionRepository(cache);

  // GET /vehicles - List all vehicles (with optional filters)
  router.get('/', async (req, res) => {
    try {
      const filters = {};
      if (req.query.status) filters.status = req.query.status;
      if (req.query.type) filters.type = req.query.type;
      if (req.query.route_id) filters.routeId = req.query.route_id;

      const vehicles = await vehicleRepository.getAllVehicles(filters);
      res.json({ vehicles: vehicles.map(v => v.toJSON()) });
    } catch (error) {
      console.error('Get vehicles error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // GET /vehicles/:id - Get vehicle details
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const vehicle = await vehicleRepository.findVehicleById(id);

      if (!vehicle) {
        return res.status(404).json({ error: 'Vehicle not found' });
      }

      res.json({ vehicle: vehicle.toJSON() });
    } catch (error) {
      console.error('Get vehicle error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // GET /vehicles/:id/position - Get current vehicle position
  // relacionado com VehicleHistory (MongoDB - ponto 3 do colega)
  router.get('/:id/position', async (req, res) => {
    try {
      const { id } = req.params;
      const vehicle = await vehicleRepository.findVehicleById(id);

      if (!vehicle) {
        return res.status(404).json({ error: 'Vehicle not found' });
      }

      // TODO: Implementação futura - buscar posição atual do veículo via VehicleHistory (MongoDB)
      // A posição será obtida do último registo em VehicleHistory com timestamp mais recente
      res.json({
        message: 'Position tracking via VehicleHistory (MongoDB)',
        vehicle_id: vehicle.id,
        vehicle_plate: vehicle.plate,
        note: 'Esta funcionalidade será implementada quando o VehicleHistory (MongoDB) estiver disponível',
      });
    } catch (error) {
      console.error('Get vehicle position error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // POST /vehicles - Create new vehicle (protected - admin only)
  router.post('/', authenticate(userRepository, sessionRepository), authorize('admin'), async (req, res) => {
    try {
      const { plate, type, capacity, status, route_id } = req.body;

      if (!plate || !type || !capacity) {
        return res.status(400).json({ error: 'Plate, type, and capacity are required' });
      }

      // Check if plate already exists
      const existingVehicle = await vehicleRepository.findVehicleByPlate(plate);
      if (existingVehicle) {
        return res.status(400).json({ error: 'Vehicle with this plate already exists' });
      }

      // relacionado com rotas (ponto 6) - route_id será validado quando Neo4j estiver disponível
      const vehicleId = await vehicleRepository.createVehicle(
        plate,
        type,
        capacity,
        status || 'inactive',
        route_id || null
      );

      const vehicle = await vehicleRepository.findVehicleById(vehicleId);

      res.status(201).json({
        message: 'Vehicle created successfully',
        vehicle: vehicle.toJSON(),
      });
    } catch (error) {
      console.error('Create vehicle error:', error);
      if (error.code === 'ER_DUP_ENTRY') {
        res.status(400).json({ error: 'Vehicle with this plate already exists' });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  });

  // PUT /vehicles/:id - Update vehicle (protected - admin only)
  router.put('/:id', authenticate(userRepository, sessionRepository), authorize('admin'), async (req, res) => {
    try {
      const { id } = req.params;
      const { plate, type, capacity, status, route_id } = req.body;

      const vehicle = await vehicleRepository.findVehicleById(id);
      if (!vehicle) {
        return res.status(404).json({ error: 'Vehicle not found' });
      }

      const updates = {};
      if (plate !== undefined) updates.plate = plate;
      if (type !== undefined) updates.type = type;
      if (capacity !== undefined) updates.capacity = capacity;
      if (status !== undefined) updates.status = status;
      if (route_id !== undefined) updates.route_id = route_id; // relacionado com rotas (ponto 6)

      const updated = await vehicleRepository.updateVehicle(id, updates);
      if (!updated) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      const updatedVehicle = await vehicleRepository.findVehicleById(id);
      res.json({
        message: 'Vehicle updated successfully',
        vehicle: updatedVehicle.toJSON(),
      });
    } catch (error) {
      console.error('Update vehicle error:', error);
      if (error.code === 'ER_DUP_ENTRY') {
        res.status(400).json({ error: 'Vehicle with this plate already exists' });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  });

  // DELETE /vehicles/:id - Delete vehicle (protected - admin only)
  router.delete('/:id', authenticate(userRepository, sessionRepository), authorize('admin'), async (req, res) => {
    try {
      const { id } = req.params;
      const vehicle = await vehicleRepository.findVehicleById(id);

      if (!vehicle) {
        return res.status(404).json({ error: 'Vehicle not found' });
      }

      await vehicleRepository.deleteVehicle(id);
      res.json({ message: 'Vehicle deleted successfully' });
    } catch (error) {
      console.error('Delete vehicle error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};

