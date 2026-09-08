const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: { type: String, sparse: true, unique: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  avatar: { type: String, default: '' },
  role: { 
    type: String, 
    enum: ['Inspector', 'Officer', 'Admin', 'Manufacturer'], 
    default: 'Inspector' 
  },
  designation: { type: String, default: 'Compliance Officer', trim: true },
  organization: { type: String, default: 'Legal Metrology Dept', trim: true },
  profileCompleted: { type: Boolean, default: false },
  passwordHash: { type: String }, // Optional for Google OAuth accounts
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
