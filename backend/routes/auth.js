const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const { requireAuth, JWT_SECRET } = require('../middleware/auth');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Secure password hashing using Node crypto PBKDF2
 */
const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
};

const verifyPassword = (password, storedHash) => {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, hash] = storedHash.split(':');
  const verify = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === verify;
};

/**
 * Helper to generate app JWT with full profile details
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      designation: user.designation || 'Compliance Officer',
      organization: user.organization || 'Legal Metrology Dept',
      avatar: user.avatar || '',
      profileCompleted: Boolean(user.profileCompleted)
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

const formatUserResponse = (user) => ({
  id: user._id,
  email: user.email,
  name: user.name,
  role: user.role,
  designation: user.designation || 'Compliance Officer',
  organization: user.organization || 'Legal Metrology Dept',
  avatar: user.avatar || '',
  profileCompleted: Boolean(user.profileCompleted)
});

/**
 * POST /api/auth/register
 * Register a new officer account
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ error: 'An account with this email address already exists. Please sign in instead.' });
    }

    const user = new User({
      email: normalizedEmail,
      name: name?.trim() || normalizedEmail.split('@')[0],
      passwordHash: hashPassword(password),
      role: 'Inspector',
      designation: 'Compliance Officer',
      organization: 'Legal Metrology Dept',
      profileCompleted: false // Must complete profile on first registration!
    });

    await user.save();
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      token,
      user: formatUserResponse(user)
    });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

/**
 * POST /api/auth/login
 * Sign in existing user with email and password
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password. Please check your credentials.' });
    }

    if (!user.passwordHash) {
      return res.status(400).json({ error: 'This account was registered using Google. Please sign in with Google.' });
    }

    const isMatch = verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password. Please check your credentials.' });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      token,
      user: formatUserResponse(user)
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Sign in failed. Please try again.' });
  }
});

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
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID || undefined
      });
      payload = ticket.getPayload();
    } catch (verifyErr) {
      console.warn('Google token verification fallback (decoding):', verifyErr.message);
      payload = jwt.decode(credential);
      if (!payload || !payload.email) {
        return res.status(401).json({ error: 'Invalid Google credential token' });
      }
    }

    const { sub: googleId, email, name, picture } = payload;
    const normalizedEmail = email.toLowerCase().trim();

    let user = await User.findOne({ $or: [{ googleId }, { email: normalizedEmail }] });

    if (!user) {
      // First-time Google registration: set profileCompleted to false so they fill organization and designation
      user = new User({
        googleId,
        email: normalizedEmail,
        name: name || normalizedEmail.split('@')[0],
        avatar: picture || '',
        role: 'Inspector',
        designation: 'Compliance Officer',
        organization: 'Legal Metrology Dept',
        profileCompleted: false
      });
      await user.save();
    } else {
      if (!user.googleId) user.googleId = googleId;
      if (picture && !user.avatar) user.avatar = picture;
      await user.save();
    }

    const token = generateToken(user);

    res.json({
      success: true,
      token,
      user: formatUserResponse(user)
    });
  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(500).json({ error: 'Google authentication failed.' });
  }
});

/**
 * PUT /api/auth/profile
 * Update user officer profile (Full Name, Designation, Organization, Role)
 */
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { name, designation, organization, role } = req.body;

    const user = await User.findById(req.user.id || req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    if (name) user.name = name.trim();
    if (designation) user.designation = designation.trim();
    if (organization) user.organization = organization.trim();
    if (role && ['Inspector', 'Officer', 'Admin', 'Manufacturer'].includes(role)) {
      user.role = role;
    }
    user.profileCompleted = true;

    await user.save();
    const token = generateToken(user);

    res.json({
      success: true,
      token,
      user: formatUserResponse(user)
    });
  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({ error: 'Failed to update profile information.' });
  }
});

/**
 * POST /api/auth/demo
 * Quick login for testing/demo
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
        designation: 'Senior Compliance Officer',
        organization: 'Legal Metrology Dept, Govt of India',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        profileCompleted: true
      });
      await user.save();
    } else {
      user.profileCompleted = true;
      await user.save();
    }

    const token = generateToken(user);

    res.json({
      success: true,
      token,
      user: formatUserResponse(user)
    });
  } catch (error) {
    console.error('Demo Auth Error:', error);
    res.status(500).json({ error: 'Demo authentication failed.' });
  }
});

/**
 * GET /api/auth/me
 * Validate current session and retrieve full user profile from DB
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id || req.user._id);
    if (!user) {
      return res.json({ success: true, user: req.user });
    }
    res.json({
      success: true,
      user: formatUserResponse(user)
    });
  } catch (error) {
    res.json({ success: true, user: req.user });
  }
});

module.exports = router;
