class Stop {
  constructor({
    id,
    name,
    type,
    zone = null,
    latitude = null,
    longitude = null,
    order = null,
    time = null,
    routes = [],
  }) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.zone = zone;
    this.latitude = latitude;
    this.longitude = longitude;
    this.order = order;
    this.time = time;
    this.routes = routes;
  }

  static fromNeo(data) {
    if (!data) return null;
    return new Stop({
      id: data.id,
      name: data.name,
      type: data.type,
      zone: data.zone ?? null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      order: data.order ?? null,
      time: data.time ?? null,
      routes: data.routes ?? [],
    });
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      zone: this.zone,
      latitude: this.latitude,
      longitude: this.longitude,
      order: this.order,
      time: this.time,
      routes: this.routes,
    };
  }
}

module.exports = Stop;
