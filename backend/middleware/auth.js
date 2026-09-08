const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'packsure-super-secure-metrology-secret-key-2026';

/**
 * Middleware to verify JWT token in Authorization header
 */
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required. Missing or invalid Bearer token.' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Authentication token missing.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Find user in database or use payload info
    let user = null;
    if (decoded.id) {
      user = await User.findById(decoded.id).select('-passwordHash');
    }

    if (!user) {
      // Fallback to token payload if user record is not yet synced
      user = {
        _id: decoded.id || 'demo_user',
        email: decoded.email,
        name: decoded.name || 'Inspector User',
        role: decoded.role || 'Inspector',
        avatar: decoded.avatar || ''
      };
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid authentication token.' });
  }
};

module.exports = {
  requireAuth,
  JWT_SECRET
};
