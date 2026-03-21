const { ObjectId } = require('mongodb');
const Trip = require('../../models/trip');

class UserHistoryRepository {
  constructor(db) {
    this.collection = db ? db.collection('user_history') : null;
  }

  // Get a list of trips for a user, limited to a certain number
  async listUserTrips(userId, { limit = 50 } = {}) {
    if (!this.collection) throw new Error('MongoDB trips collection unavailable');
    const docs = await this.collection
      .find({ user_id: userId })
      .sort({ started_at: -1 })
      .limit(limit)
      .toArray();
    return docs.map((doc) => Trip.fromDocument(doc));
  }

  // Get trip by its id, optionally ensuring it belongs to the specified user
  async getTripById(tripId, userId) {
    if (!this.collection) throw new Error('MongoDB trips collection unavailable');
    const filter = { _id: new ObjectId(tripId) };
    if (userId !== undefined) {
      filter.user_id = userId;
    }
    const doc = await this.collection.findOne(filter);
    return Trip.fromDocument(doc);
  }

  // Get user trip statistics
  async getUserStats(userId) {
    if (!this.collection) throw new Error('MongoDB trips collection unavailable');
    const pipeline = [
      { $match: { user_id: userId } },
      {
        $addFields: {
          duration_ms_computed: {
            $cond: [
              { $ifNull: ['$duration_ms', false] },
              '$duration_ms',
              {
                $cond: [
                  { $and: ['$started_at', '$ended_at'] },
                  { $subtract: ['$ended_at', '$started_at'] },
                  null,
                ],
              },
            ],
          },
        },
      },
      {
        $group: {
          _id: '$user_id',
          trip_count: { $sum: 1 },
          total_duration_ms: { $sum: { $ifNull: ['$duration_ms_computed', 0] } },
          avg_duration_ms: { $avg: '$duration_ms_computed' },
          last_trip_started_at: { $max: '$started_at' },
          last_trip_ended_at: { $max: '$ended_at' },
        },
      },
    ];

    const [stats] = await this.collection.aggregate(pipeline).toArray();
    if (!stats) {
      return {
        user_id: userId,
        trip_count: 0,
        total_duration_ms: 0,
        avg_duration_ms: null,
        last_trip_started_at: null,
        last_trip_ended_at: null,
      };
    }

    return {
      user_id: userId,
      trip_count: stats.trip_count,
      total_duration_ms: stats.total_duration_ms,
      avg_duration_ms: stats.avg_duration_ms ?? null,
      last_trip_started_at: stats.last_trip_started_at ?? null,
      last_trip_ended_at: stats.last_trip_ended_at ?? null,
    };
  }
}

module.exports = UserHistoryRepository;
