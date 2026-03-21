class Route {
  constructor({
    id,
    name,
    number,
    active = true,
    schedule = null,
    stopCount = 0,
  }) {
    this.id = id;
    this.name = name;
    this.number = number;
    this.active = active;
    this.schedule = schedule;
    this.stopCount = stopCount;
  }

  static fromNeo(data) {
    if (!data) return null;
    return new Route({
      id: data.id,
      name: data.name,
      number: data.number,
      active: data.active !== undefined ? data.active : true,
      schedule: data.schedule || null,
      stopCount: data.stopCount ?? 0,
    });
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      number: this.number,
      active: this.active,
      schedule: this.schedule,
      stopCount: this.stopCount,
    };
  }
}

module.exports = Route;
