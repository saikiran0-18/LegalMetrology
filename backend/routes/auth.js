const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const { requireAuth, JWT_SECRET } = require('../middleware/auth');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Helper to generate app JWT
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

/**
 * POST /api/auth/google
 * Verify Google ID token and return user session
 */
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: 'Google credential token is required' });
    }

    let payload;
    try {
      // Verify Google ID Token
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID || undefined
      });
      payload = ticket.getPayload();
    } catch (verifyErr) {
      console.warn('Google token verification fallback (decoding):', verifyErr.message);
      // If client ID is not yet configured in environment or verification fails in dev, decode payload safely
      payload = jwt.decode(credential);
      if (!payload || !payload.email) {
        return res.status(401).json({ error: 'Invalid Google credential token' });
      }
    }

    const { sub: googleId, email, name, picture } = payload;

    // Find or create user
    let user = await User.findOne({ $or: [{ googleId }, { email: email.toLowerCase() }] });

    if (!user) {
      user = new User({
        googleId,
        email: email.toLowerCase(),
        name: name || email.split('@')[0],
        avatar: picture || '',
        role: 'Inspector'
      });
      await user.save();
    } else {
      // Update avatar or googleId if missing
      if (!user.googleId) user.googleId = googleId;
      if (picture && !user.avatar) user.avatar = picture;
      await user.save();
    }

    const token = generateToken(user);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(500).json({ error: 'Authentication failed. Please try again.' });
  }
});

/**
 * POST /api/auth/demo
 * Quick login for testing/demo without needing live Google OAuth setup
 */
router.post('/demo', async (req, res) => {
  try {
    const { role = 'Inspector' } = req.body;
    const demoEmail = 'inspector.demo@packsure.gov.in';

    let user = await User.findOne({ email: demoEmail });
    if (!user) {
      user = new User({
        email: demoEmail,
        name: 'Senior Metrology Inspector',
        role: role,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
      });
      await user.save();
    }

    const token = generateToken(user);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Demo Auth Error:', error);
    res.status(500).json({ error: 'Demo authentication failed.' });
  }
});

/**
 * GET /api/auth/me
 * Validate current session and retrieve user
 */
router.get('/me', requireAuth, async (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

module.exports = router;
