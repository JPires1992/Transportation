const Vehicle = require('../../models/vehicle');

class VehicleRepository {
  constructor(db) {
    this.db = db;
  }

  async createVehicle(plate, type, capacity, status = 'inactive', routeId = null) {
    const [result] = await this.db.execute(
      'INSERT INTO vehicles (plate, type, capacity, status, route_id) VALUES (?, ?, ?, ?, ?)',
      [plate, type, capacity, status, routeId]
    );
    return result.insertId;
  }

  async findVehicleById(id) {
    const [rows] = await this.db.execute(
      'SELECT * FROM vehicles WHERE id = ?',
      [id]
    );
    return rows.length > 0 ? Vehicle.fromRow(rows[0]) : null;
  }

  async findVehicleByPlate(plate) {
    const [rows] = await this.db.execute(
      'SELECT * FROM vehicles WHERE plate = ?',
      [plate]
    );
    return rows.length > 0 ? Vehicle.fromRow(rows[0]) : null;
  }

  async getAllVehicles(filters = {}) {
    let query = 'SELECT * FROM vehicles WHERE 1=1';
    const params = [];

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.type) {
      query += ' AND type = ?';
      params.push(filters.type);
    }

    if (filters.routeId) {
      query += ' AND route_id = ?';
      params.push(filters.routeId);
    }

    query += ' ORDER BY created_at DESC';

    const [rows] = await this.db.execute(query, params);
    return rows.map(row => Vehicle.fromRow(row));
  }

  async updateVehicle(id, updates) {
    const allowedFields = ['plate', 'type', 'capacity', 'status', 'route_id'];
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      const dbKey = key === 'routeId' ? 'route_id' : key;
      if (allowedFields.includes(dbKey) && value !== undefined) {
        fields.push(`${dbKey} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) {
      return false;
    }

    values.push(id);
    const [result] = await this.db.execute(
      `UPDATE vehicles SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    return result.affectedRows > 0;
  }

  async updateVehicleStatus(id, status) {
    const [result] = await this.db.execute(
      'UPDATE vehicles SET status = ? WHERE id = ?',
      [status, id]
    );
    return result.affectedRows > 0;
  }

  async deleteVehicle(id) {
    const [result] = await this.db.execute(
      'DELETE FROM vehicles WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }
}

module.exports = VehicleRepository;

