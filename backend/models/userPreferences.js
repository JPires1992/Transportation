class UserPreferences {
  constructor({
    id = null,
    userId,
    favoriteRoutes = [],
    favoriteStops = [],
    notifyRouteChanges = false,
    notifyEta = false,
    feedbackScore = null,
    feedbackText = null,
    createdAt = null,
    updatedAt = null,
  }) {
    this.id = id;
    this.userId = userId;
    this.favoriteRoutes = favoriteRoutes;
    this.favoriteStops = favoriteStops;
    this.notifyRouteChanges = notifyRouteChanges;
    this.notifyEta = notifyEta;
    this.feedbackScore = feedbackScore;
    this.feedbackText = feedbackText;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static defaultForUser(userId) {
    return new UserPreferences({
      userId,
      favoriteRoutes: [],
      favoriteStops: [],
      notifyRouteChanges: false,
      notifyEta: false,
      feedbackScore: null,
      feedbackText: null,
      createdAt: null,
      updatedAt: null,
    });
  }

  static fromDocument(doc) {
    if (!doc) return null;
    return new UserPreferences({
      id: doc._id ? doc._id.toString() : null,
      userId: doc.user_id,
      favoriteRoutes: doc.favorite_routes || [],
      favoriteStops: doc.favorite_stops || [],
      notifyRouteChanges: !!doc.notify_route_changes,
      notifyEta: !!doc.notify_eta,
      feedbackScore: doc.feedback_score ?? null,
      feedbackText: doc.feedback_text ?? null,
      createdAt: doc.created_at ?? null,
      updatedAt: doc.updated_at ?? null,
    });
  }

  toJSON() {
    return {
      id: this.id,
      user_id: this.userId,
      favorite_routes: this.favoriteRoutes,
      favorite_stops: this.favoriteStops,
      notify_route_changes: this.notifyRouteChanges,
      notify_eta: this.notifyEta,
      feedback_score: this.feedbackScore,
      feedback_text: this.feedbackText,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
    };
  }
}

module.exports = UserPreferences;
