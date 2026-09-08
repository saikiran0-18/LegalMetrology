require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const scanRoutes = require('./routes/scan');
const historyRoutes = require('./routes/history');
const rulesRoutes = require('./routes/rules');

const app = express();
const PORT = process.env.PORT || 5000;

// Security: Helmet HTTP headers (configured to allow serving uploaded images cross-origin)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Security: General API Rate Limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' }
});
app.use('/api', generalLimiter);

// Security: Stricter Scan Rate Limiter to prevent Gemini API quota abuse
const scanLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // 30 scans per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Scan rate limit reached (30 scans per 15m). Please wait a few minutes before scanning again.' }
});
app.use('/api/scan', scanLimiter);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(uploadsDir));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/scan', scanRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/rules', rulesRoutes);

// MongoDB connection
const { seedRules } = require('./scripts/seedRules');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/packsure')
  .then(async () => {
    console.log('Connected to MongoDB');
    // Ensure Central & State rules are seeded
    try {
      await seedRules();
    } catch (seedErr) {
      console.warn('Initial rule seeding skipped or failed:', seedErr.message);
    }

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB', err);
  });
