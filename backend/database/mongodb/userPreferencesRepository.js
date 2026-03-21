const UserPreferences = require('../../models/userPreferences');

class UserPreferencesRepository {
  constructor(db) {
    this.collection = db ? db.collection('user_preferences') : null;
  }

  ensureAvailable() {
    if (!this.collection) {
      throw new Error('MongoDB user_preferences collection unavailable');
    }
  }

  // Get user preferences by user ID
  async getByUserId(userId) {
    this.ensureAvailable();
    const doc = await this.collection.findOne({ user_id: userId });
    if (!doc) {
      return UserPreferences.defaultForUser(userId);
    }
    return UserPreferences.fromDocument(doc);
  }

  // Update notification settings for a user
  async updateNotificationSettings(userId, { notifyRouteChanges, notifyEta }) {
    this.ensureAvailable();
    const now = new Date();
    const set = { updated_at: now };
    if (notifyRouteChanges !== undefined) set.notify_route_changes = !!notifyRouteChanges;
    if (notifyEta !== undefined) set.notify_eta = !!notifyEta;

    const setOnInsert = {
      user_id: userId,
      favorite_routes: [],
      favorite_stops: [],
      notify_route_changes: false,
      notify_eta: false,
      created_at: now,
    };
    if (set.notify_route_changes !== undefined) delete setOnInsert.notify_route_changes;
    if (set.notify_eta !== undefined) delete setOnInsert.notify_eta;

    const result = await this.collection.findOneAndUpdate(
      { user_id: userId },
      {
        $set: set,
        $setOnInsert: setOnInsert,
      },
      { upsert: true, returnDocument: 'after' }
    );
    if (result.value) return UserPreferences.fromDocument(result.value);
    const fallback = await this.collection.findOne({ user_id: userId });
    return UserPreferences.fromDocument(fallback) || UserPreferences.defaultForUser(userId);
  }

  // Update favorite routes and stops for a user
  async updateFavorites(userId, { favoriteRoutes, favoriteStops }) {
    this.ensureAvailable();
    const now = new Date();
    const set = { updated_at: now };

    if (favoriteRoutes !== undefined) set.favorite_routes = favoriteRoutes;
    if (favoriteStops !== undefined) set.favorite_stops = favoriteStops;

    const setOnInsert = {
      user_id: userId,
      favorite_routes: [],
      favorite_stops: [],
      notify_route_changes: false,
      notify_eta: false,
      created_at: now,
    };
    if (set.favorite_routes !== undefined) delete setOnInsert.favorite_routes;
    if (set.favorite_stops !== undefined) delete setOnInsert.favorite_stops;

    const result = await this.collection.findOneAndUpdate(
      { user_id: userId },
      {
        $set: set,
        $setOnInsert: setOnInsert,
      },
      { upsert: true, returnDocument: 'after' }
    );
    if (result.value) return UserPreferences.fromDocument(result.value);
    const fallback = await this.collection.findOne({ user_id: userId });
    return UserPreferences.fromDocument(fallback) || UserPreferences.defaultForUser(userId);
  }

  // Save user feedback (score and text)
  async saveFeedback(userId, { feedbackScore, feedbackText }) {
    this.ensureAvailable();
    const now = new Date();
    const set = { updated_at: now };
    if (feedbackScore !== undefined) set.feedback_score = feedbackScore;
    if (feedbackText !== undefined) set.feedback_text = feedbackText;

    const setOnInsert = {
      user_id: userId,
      favorite_routes: [],
      favorite_stops: [],
      notify_route_changes: false,
      notify_eta: false,
      created_at: now,
    };
    if (set.feedback_score !== undefined) delete setOnInsert.feedback_score;
    if (set.feedback_text !== undefined) delete setOnInsert.feedback_text;

    const result = await this.collection.findOneAndUpdate(
      { user_id: userId },
      {
        $set: set,
        $setOnInsert: setOnInsert,
      },
      { upsert: true, returnDocument: 'after' }
    );
    if (result.value) return UserPreferences.fromDocument(result.value);
    const fallback = await this.collection.findOne({ user_id: userId });
    return UserPreferences.fromDocument(fallback) || UserPreferences.defaultForUser(userId);
  }

  // List active notifications based on user preferences
  async listActiveNotifications(userId) {
    const preferences = await this.getByUserId(userId);
    const notifications = [];
    if (preferences.notifyRouteChanges) {
      notifications.push({
        type: 'route_change',
        routes: preferences.favoriteRoutes,
        message: 'Notifications for route changes are active.',
      });
    }
    if (preferences.notifyEta) {
      notifications.push({
        type: 'eta',
        stops: preferences.favoriteStops,
        message: 'ETA notifications are active.',
      });
    }
    return notifications;
  }
}

module.exports = UserPreferencesRepository;
