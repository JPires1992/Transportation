const { Router } = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config');
const UserRepository = require('../database/mysql/userRepository');
const SessionRepository = require('../database/redis/sessionRepository');
const { authenticate } = require('../middleware/auth');

module.exports = ({ db, cache }) => {
  const router = Router();
  const userRepository = new UserRepository(db);
  const sessionRepository = new SessionRepository(cache);

  // POST /auth/signup - Register new user
  router.post('/signup', async (req, res) => {
    try {
      const { name, email, phone, password } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
      }

      // Check if user already exists
      const existingUser = await userRepository.findUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user
      const userId = await userRepository.createUser(name, email, phone, passwordHash);
      const user = await userRepository.findUserById(userId);

      res.status(201).json({
        message: 'User created successfully',
        user: user.toJSON(),
      });
    } catch (error) {
      console.error('Signup error:', error);
      if (error.code === 'ER_DUP_ENTRY') {
        res.status(400).json({ error: 'Email already registered' });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  });

  // POST /auth/login - Authenticate user
  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      // Find user
      const user = await userRepository.findUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Verify password
      const passwordMatch = await bcrypt.compare(password, user.passwordHash);
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      // Store session in Redis
      const expiresInSeconds = 86400; // 24 hours
      await sessionRepository.createSession(user.id, token, expiresInSeconds);

      res.json({
        message: 'Login successful',
        token,
        user: user.toJSON(),
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // POST /auth/logout - Terminate session
  router.post('/logout', authenticate(userRepository, sessionRepository), async (req, res) => {
    try {
      await sessionRepository.deleteSession(req.token);
      res.json({ message: 'Logout successful' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};

