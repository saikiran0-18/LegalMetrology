const mongoose = require('mongoose');

const ruleVersionSchema = new mongoose.Schema({
  version: {
    type: String,
    required: true,
    index: true
  }, // e.g. "1.0", "2.0", "3.0"
  ruleId: {
    type: String,
    required: true,
    index: true
  }, // e.g. "RULE-06-1-DA"
  ruleNumber: {
    type: String,
    required: true
  }, // e.g. "Rule 6(1)(da)"
  title: {
    type: String,
    required: true
  },
  requirement: {
    type: String,
    required: true
  }, // Full statutory text / requirement
  jurisdiction: {
    type: String,
    enum: ['Central', 'State'],
    required: true,
    default: 'Central',
    index: true
  },
  stateName: {
    type: String,
    default: null,
    index: true
  },
  productCategory: {
    type: String,
    default: 'All',
    index: true
  },
  effectiveFrom: {
    type: Date,
    required: true,
    index: true
  },
  effectiveTo: {
    type: Date,
    default: null, // null means indefinitely effective until amended
    index: true
  },
  sourceDocument: {
    type: String,
    required: true,
    default: 'Legal Metrology (Packaged Commodities) Rules, 2011'
  },
  sourceUrl: {
    type: String,
    default: 'https://consumeraffairs.nic.in/acts-and-rules/legal-metrology/packaged-commodities-rules-2011'
  },
  approvalStatus: {
    type: String,
    enum: ['Approved', 'Pending', 'Draft', 'Rejected'],
    default: 'Approved',
    index: true
  },
  approvedBy: {
    type: String,
    required: true,
    default: 'Director, Legal Metrology (Ministry of Consumer Affairs)'
  },
  approvedDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  amendments: {
    type: String,
    default: 'Initial statutory notification'
  }, // e.g. "Amended via G.S.R. 779(E) dated 02.11.2021"
  status: {
    type: String,
    enum: ['Active', 'Scheduled', 'Expired', 'Draft'],
    default: 'Active',
    index: true
  },
  weight: {
    type: Number,
    default: 10
  },
  severity: {
    type: String,
    enum: ['HIGH', 'MEDIUM', 'LOW'],
    default: 'MEDIUM'
  },
  evaluatorKey: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Compound unique index ensuring each version of a rule is unique and preserved
ruleVersionSchema.index({ ruleId: 1, version: 1 }, { unique: true });
// Compound index for fast temporal resolution by date & jurisdiction
ruleVersionSchema.index({ ruleId: 1, effectiveFrom: 1, effectiveTo: 1 });

module.exports = mongoose.model('RuleVersion', ruleVersionSchema);
