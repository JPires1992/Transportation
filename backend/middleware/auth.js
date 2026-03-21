const jwt = require('jsonwebtoken');
const config = require('../config');

function authenticate(userRepository, sessionRepository) {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      // Check if token exists in Redis
      const session = await sessionRepository.getSession(token);
      if (!session) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }

      // Verify JWT token
      let decoded;
      try {
        decoded = jwt.verify(token, config.jwt.secret);
      } catch (err) {
        // Token is invalid, remove from Redis
        await sessionRepository.deleteSession(token);
        return res.status(401).json({ error: 'Invalid token' });
      }

      // Verify user still exists
      const user = await userRepository.findUserById(decoded.userId);
      if (!user) {
        await sessionRepository.deleteSession(token);
        return res.status(401).json({ error: 'User not found' });
      }

      // Attach user to request
      req.user = user;
      req.token = token;
      next();
    } catch (error) {
      console.error('Authentication error:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  };
}

function authorize(roles = []) {
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: User not authenticated' });
    }

    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }

    next();
  };
}

module.exports = { authenticate, authorize };
