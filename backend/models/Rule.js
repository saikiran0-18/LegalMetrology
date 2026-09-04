const mongoose = require('mongoose');

const ruleSchema = new mongoose.Schema({
  ruleId: { type: String, required: true, unique: true },
  ruleName: { type: String, required: true },
  requirement: { type: String, required: true },
  applicableCategory: { type: String, default: 'General' },
  severity: { type: String, enum: ['HIGH', 'MEDIUM', 'LOW'], default: 'MEDIUM' },
  sourceReference: { type: String },
  enabled: { type: Boolean, default: true }
});

module.exports = mongoose.model('Rule', ruleSchema);
