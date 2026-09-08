const mongoose = require('mongoose');

const scanSchema = new mongoose.Schema({
  productId: { type: String, required: false },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  inspectorName: { type: String, default: 'Officer' },
  imagePath: { type: String, required: true },
  extractedText: { type: String, required: false },
  extractedInfo: {
    productName: { type: String, default: 'Not detected' },
    netQuantity: { type: String, default: 'Not detected' },
    mrp: { type: String, default: 'Not detected' },
    manufacturer: { type: String, default: 'Not detected' },
    address: { type: String, default: 'Not detected' },
    batchNumber: { type: String, default: 'Not detected' },
    manufacturingDate: { type: String, default: 'Not detected' },
    consumerCare: { type: String, default: 'Not detected' },
    countryOfOrigin: { type: String, default: 'Not detected' },
  },
  ruleResults: [
    {
      ruleId: String,
      ruleName: String,
      requirement: String,
      detectedValue: String,
      status: { type: String, enum: ['PASS', 'WARNING', 'FAIL', 'NOT_APPLICABLE'] },
      severity: String,
      explanation: String,
      recommendation: String,
      confidence: Number,
    }
  ],
  score: { type: Number, default: 0 },
  riskLevel: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'] },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Scan', scanSchema);
