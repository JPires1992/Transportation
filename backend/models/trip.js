const { ObjectId } = require('mongodb');

function toObjectId(id) {
  if (!id) return null;
  try {
    return typeof id === 'string' ? new ObjectId(id) : id;
  } catch (_) {
    return null;
  }
}

class Trip {
  constructor({
    id = null,
    userId,
    origin = null,
    destination = null,
    startedAt = null,
    endedAt = null,
    durationMs = null,
    durationMinutes = null
  }) {
    this.id = id;
    this.userId = userId;
    this.origin = origin;
    this.destination = destination;
    this.startedAt = startedAt;
    this.endedAt = endedAt;
    this.durationMs = durationMs;
    this.durationMinutes = durationMinutes;
  }

  static computeDurationMs(doc) {
    if (doc.duration_ms !== undefined && doc.duration_ms !== null) {
      return doc.duration_ms;
    }
    if (doc.started_at && doc.ended_at) {
      const start = doc.started_at instanceof Date ? doc.started_at.getTime() : new Date(doc.started_at).getTime();
      const end = doc.ended_at instanceof Date ? doc.ended_at.getTime() : new Date(doc.ended_at).getTime();
      if (!Number.isNaN(start) && !Number.isNaN(end)) {
        return end - start;
      }
    }
    return null;
  }

  static computeDurationMinutes(doc) {
    const ms = Trip.computeDurationMs(doc);
    if (ms === null || ms === undefined) return null;
    // return minutes as a floating number (e.g., 12.5 means 12.5 minutes)
    return ms / 60000;
  }

  static fromDocument(doc) {
    if (!doc) return null;
    return new Trip({
      id: doc._id ? doc._id.toString() : null,
      userId: doc.user_id,
      origin: doc.origin || null,
      destination: doc.destination || null,
      startedAt: doc.started_at || null,
      endedAt: doc.ended_at || null,
      durationMs: Trip.computeDurationMs(doc),
      durationMinutes: Trip.computeDurationMinutes(doc),
    });
  }

  toDocument() {
    return {
      _id: toObjectId(this.id) || undefined,
      user_id: this.userId,
      origin: this.origin || null,
      destination: this.destination || null,
      started_at: this.startedAt ? new Date(this.startedAt) : null,
      ended_at: this.endedAt ? new Date(this.endedAt) : null,
      duration_ms: this.durationMs
    };
  }

  toJSON() {
    return {
      id: this.id,
      user_id: this.userId,
      origin: this.origin,
      destination: this.destination,
      started_at: this.startedAt,
      ended_at: this.endedAt,
      duration_ms: this.durationMs,
      duration_minutes: this.durationMinutes,
    };
  }
}

module.exports = Trip;
