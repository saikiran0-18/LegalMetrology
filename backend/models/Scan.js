const mongoose = require('mongoose');

const scanSchema = new mongoose.Schema({
  productId: { type: String, required: false },
  productCategory: { type: String, default: 'General Packaged Commodity' },
  inspectionState: { type: String, default: 'Central (All India)' },
  inspectionDate: { type: Date, default: Date.now },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  inspectorName: { type: String, default: 'Officer' },
  imagePath: { type: String, required: true },
  extractedText: { type: String, required: false },
  extractedInfo: {
    productName: { type: String, default: 'Not detected' },
    productCategory: { type: String, default: 'General Packaged Commodity' },
    netQuantity: { type: String, default: 'Not detected' },
    mrp: { type: String, default: 'Not detected' },
    unitSalePrice: { type: String, default: 'Not detected' },
    dimensions: { type: String, default: 'Not detected' },
    manufacturer: { type: String, default: 'Not detected' },
    address: { type: String, default: 'Not detected' },
    batchNumber: { type: String, default: 'Not detected' },
    manufacturingDate: { type: String, default: 'Not detected' },
    consumerCare: { type: String, default: 'Not detected' },
    countryOfOrigin: { type: String, default: 'Not detected' },
    prohibitedWords: { type: Array, default: [] },
  },
  ruleResults: [
    {
      ruleId: String,
      ruleNumber: String,
      ruleName: String,
      jurisdiction: { type: String, enum: ['Central', 'State'], default: 'Central' },
      stateName: { type: String, default: null },
      productCategory: { type: String, default: 'All' },
      requirement: String,
      detectedValue: String,
      status: { type: String, enum: ['PASS', 'WARNING', 'FAIL', 'NOT_APPLICABLE'] },
      severity: String,
      explanation: String,
      recommendation: String,
      confidence: Number,
      sourceDocument: String,
      sourceUrl: String,
      version: String,
      weight: Number,
      effectiveFrom: Date,
      effectiveTo: Date,
      approvalStatus: String,
      approvedBy: String,
      approvedDate: Date,
      amendments: String,
      // Evidence Management Attributes
      evidenceId: { type: String, default: null },
      declarationType: { type: String, default: 'General Declaration' },
      violationCategory: { type: String, default: 'Missing Mandatory Declaration' },
      highlightedRegion: {
        x: { type: Number, default: 10 },
        y: { type: Number, default: 10 },
        width: { type: Number, default: 35 },
        height: { type: Number, default: 20 }
      },
      croppedEvidenceUrl: { type: String, default: null },
      originalImagePath: { type: String, default: null },
      extractedText: { type: String, default: '' },
      aiConfidence: { type: Number, default: 0.90 },
      officerVerificationStatus: {
        type: String,
        enum: ['AI_DETECTED', 'OFFICER_VERIFIED', 'OFFICER_REJECTED'],
        default: 'AI_DETECTED'
      },
      officerComments: { type: String, default: '' },
      verifiedBy: { type: String, default: null },
      verifiedAt: { type: Date, default: null },
      additionalEvidence: [
        {
          fileUrl: String,
          originalName: String,
          uploadedAt: { type: Date, default: Date.now },
          notes: { type: String, default: '' }
        }
      ],
      createdAt: { type: Date, default: Date.now }
    }
  ],
  score: { type: Number, default: 0 },
  riskLevel: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'] },
  legalEnforcementStatus: {
    type: String,
    enum: ['PENDING_OFFICER_REVIEW', 'LEGAL_VIOLATIONS_CONFIRMED', 'ALL_VIOLATIONS_DISMISSED', 'COMPLIANT'],
    default: 'PENDING_OFFICER_REVIEW'
  },
  officerReviewedAt: { type: Date, default: null },
  officerReviewedBy: { type: String, default: null },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Scan', scanSchema);
