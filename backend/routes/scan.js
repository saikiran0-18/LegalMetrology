const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { performOCR } = require('../services/ocrService');
const { extractInformation } = require('../services/extractionService');
const { evaluateCompliance } = require('../rules');
const Scan = require('../models/Scan');

// Configure Multer for local file storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

router.post('/', upload.single('productImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const imagePath = req.file.path;

    // 1. OCR Extraction
    const rawText = await performOCR(imagePath);

    // 2. Information Extraction
    const extractedInfo = await extractInformation(rawText, imagePath);

    // 3. Compliance Evaluation
    const complianceResults = evaluateCompliance(extractedInfo);

    const finalRawText = extractedInfo.rawText || rawText;

    // 4. Save to Database
    const newScan = new Scan({
      imagePath: imagePath.replace(/\\/g, '/'), // normalize path
      extractedText: finalRawText,
      extractedInfo: extractedInfo,
      ruleResults: complianceResults.ruleResults,
      score: complianceResults.score,
      riskLevel: complianceResults.riskLevel,
    });

    await newScan.save();

    res.json({
      success: true,
      scanId: newScan._id,
      ...complianceResults,
      extractedInfo
    });
  } catch (error) {
    console.error('Scan Error:', error);
    res.status(500).json({ error: 'An error occurred during scan processing' });
  }
});

module.exports = router;
