const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { performOCR } = require('../services/ocrService');
const { extractInformation } = require('../services/extractionService');
const { evaluateCompliance } = require('../rules');
const Scan = require('../models/Scan');

const { requireAuth } = require('../middleware/auth');

// Configure Multer for secure file storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // Sanitize extension
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'product-' + uniqueSuffix + ext);
  }
});

// Security: Validate file type and size
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Middleware wrapper to catch Multer errors gracefully
const uploadSingle = (req, res, next) => {
  upload.single('productImage')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size limit exceeded. Maximum image size is 5MB.' });
      }
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};

router.post('/', requireAuth, uploadSingle, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const imagePath = req.file.path;

    // 1. OCR Extraction
    let rawText = '';
    try {
      rawText = await performOCR(imagePath);
    } catch (ocrErr) {
      console.warn('Tesseract OCR warning (proceeding with fallback extraction):', ocrErr.message);
    }

    // 2. Information Extraction
    const extractedInfo = await extractInformation(rawText, imagePath);

    // 3. Compliance Evaluation
    const complianceResults = evaluateCompliance(extractedInfo);

    const finalRawText = extractedInfo.rawText || rawText;

    // 4. Save to Database
    const newScan = new Scan({
      userId: req.user?._id !== 'demo_user' ? req.user?._id : undefined,
      inspectorName: req.user?.name || 'Inspector Officer',
      productCategory: complianceResults.productCategory || extractedInfo.productCategory || 'General Packaged Commodity',
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
