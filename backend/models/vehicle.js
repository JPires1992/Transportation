class Vehicle {
  constructor({
    id = null,
    plate,
    type,
    capacity,
    status = 'inactive',
    routeId = null,
    createdAt = null,
    updatedAt = null,
  }) {
    this.id = id;
    this.plate = plate;
    this.type = type;
    this.capacity = capacity;
    this.status = status;
    this.routeId = routeId;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static fromRow(row) {
    if (!row) return null;
    return new Vehicle({
      id: row.id ?? null,
      plate: row.plate,
      type: row.type,
      capacity: row.capacity,
      status: row.status ?? 'inactive',
      routeId: row.route_id ?? row.routeId ?? null,
      createdAt: row.created_at ?? row.createdAt ?? null,
      updatedAt: row.updated_at ?? row.updatedAt ?? null,
    });
  }

  toJSON() {
    return {
      id: this.id,
      plate: this.plate,
      type: this.type,
      capacity: this.capacity,
      status: this.status,
      route_id: this.routeId,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
    };
  }
}

module.exports = Vehicle;

