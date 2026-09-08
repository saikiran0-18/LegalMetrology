const mongoose = require('mongoose');

const ruleSchema = new mongoose.Schema({
  ruleId: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true 
  },
  ruleNumber: { 
    type: String, 
    required: true 
  }, // e.g. "Rule 6(1)(a)", "Rule 7(1)"
  title: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String, 
    required: true 
  },
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
  }, // e.g. "Telangana", "Maharashtra", null for Central rules
  productCategory: { 
    type: String, 
    default: 'All',
    index: true
  }, // "All", "Apparel & Textiles", "Food & Beverages", etc.
  effectiveFrom: { 
    type: Date, 
    required: true, 
    default: () => new Date('2011-04-01') 
  },
  effectiveTo: { 
    type: Date, 
    default: null 
  }, // null means indefinitely effective
  status: { 
    type: String, 
    enum: ['Active', 'Scheduled', 'Expired', 'Draft'], 
    default: 'Active',
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
  lastVerifiedDate: { 
    type: Date, 
    default: Date.now 
  },
  version: { 
    type: String, 
    default: '2011.1' 
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
  approvalStatus: {
    type: String,
    enum: ['Approved', 'Pending', 'Draft', 'Rejected'],
    default: 'Approved'
  },
  approvedBy: {
    type: String,
    default: 'Director, Legal Metrology (Ministry of Consumer Affairs)'
  },
  approvedDate: {
    type: Date,
    default: Date.now
  },
  amendments: {
    type: String,
    default: 'Statutory enactment'
  },
  evaluatorKey: { 
    type: String, 
    required: true 
  }, // internal handler key to evaluate rule against extractedInfo
  enabled: { 
    type: Boolean, 
    default: true 
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Rule', ruleSchema);
