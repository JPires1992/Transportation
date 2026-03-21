class SessionRepository {
  constructor(redisClient) {
    this.redis = redisClient;
  }

  async createSession(userId, token, expiresIn = 86400) {
    // expiresIn in seconds (default 24 hours)
    const sessionData = {
      userId,
      token,
      createdAt: new Date().toISOString(),
    };
    
    const key = `session:${token}`;
    await this.redis.setEx(key, expiresIn, JSON.stringify(sessionData));
    
    // Also store user sessions index for cleanup
    await this.redis.sAdd(`user:${userId}:sessions`, token);
    
    return sessionData;
  }

  async getSession(token) {
    const key = `session:${token}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async deleteSession(token) {
    const session = await this.getSession(token);
    if (session) {
      const key = `session:${token}`;
      await this.redis.del(key);
      await this.redis.sRem(`user:${session.userId}:sessions`, token);
      return true;
    }
    return false;
  }

  async deleteAllUserSessions(userId) {
    const sessionTokens = await this.redis.sMembers(`user:${userId}:sessions`);
    if (sessionTokens.length > 0) {
      const keys = sessionTokens.map(token => `session:${token}`);
      await this.redis.del(keys);
      await this.redis.del(`user:${userId}:sessions`);
      return sessionTokens.length;
    }
    return 0;
  }

  async extendSession(token, expiresIn = 86400) {
    const session = await this.getSession(token);
    if (session) {
      const key = `session:${token}`;
      await this.redis.expire(key, expiresIn);
      return true;
    }
    return false;
  }
}

module.exports = SessionRepository;

