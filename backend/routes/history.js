const express = require('express');
const router = express.Router();
const path = require('path');
const Scan = require('../models/Scan');
const { requireAuth } = require('../middleware/auth');

// Protect all history endpoints
router.use(requireAuth);

const fs = require('fs');
const uploadsDir = path.join(__dirname, '../uploads');

const normalizeScan = (doc) => {
  if (!doc) return doc;
  const s = doc.toObject ? doc.toObject() : { ...doc };

  // 1. If imagePath exists, normalize it
  if (s.imagePath && s.imagePath !== 'Not detected') {
    const filename = path.basename(s.imagePath);
    s.imagePath = `/uploads/${filename}`;
  } else {
    // 2. Fallback to evidence image if available
    let resolvedEvidence = null;
    if (Array.isArray(s.ruleResults)) {
      for (const r of s.ruleResults) {
        if (r.originalImagePath) {
          resolvedEvidence = `/uploads/${path.basename(r.originalImagePath)}`;
          break;
        }
        if (r.croppedEvidenceUrl) {
          resolvedEvidence = `/uploads/${path.basename(r.croppedEvidenceUrl)}`;
          break;
        }
      }
    }
    s.imagePath = resolvedEvidence || '/uploads/default-product.png';
  }

  // 1b. Normalize enhancedImagePath if present
  if (s.enhancedImagePath) {
    const enhancedFilename = path.basename(s.enhancedImagePath);
    s.enhancedImagePath = `/uploads/${enhancedFilename}`;
  }

  return s;
};

// Get all scans
router.get('/', async (req, res) => {
  try {
    const scans = await Scan.find().sort({ timestamp: -1 });
    res.json(scans.map(normalizeScan));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Get scan by ID
router.get('/:id', async (req, res) => {
  try {
    const scan = await Scan.findById(req.params.id);
    if (!scan) return res.status(404).json({ error: 'Scan not found' });

    // Fallback: If scan was created prior to readability or imageQuality module, compute on first load
    let needsSave = false;
    const path = require('path');
    let imgPath = scan.imagePath;
    if (!path.isAbsolute(imgPath)) {
      imgPath = path.join(__dirname, '..', scan.imagePath);
    }

    if (!scan.readabilityAssessments || scan.readabilityAssessments.length === 0) {
      try {
        const { assessDeclarationReadability } = require('../services/readabilityService');
        scan.readabilityAssessments = await assessDeclarationReadability(imgPath, scan.extractedInfo || {}, scan.calibration?.pixelsPerMm || null);
        needsSave = true;
      } catch (err) {
        console.warn('Lazy readability evaluation warning:', err.message);
      }
    }

    if (!scan.imageQuality || !scan.imageQuality.clarityStatus) {
      try {
        const { assessOverallImageQuality } = require('../services/readabilityService');
        scan.imageQuality = await assessOverallImageQuality(imgPath);
        needsSave = true;
      } catch (err) {
        console.warn('Lazy imageQuality evaluation warning:', err.message);
      }
    }

    if (needsSave) {
      try { await scan.save(); } catch (e) {}
    }

    res.json(normalizeScan(scan));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch scan details' });
  }
});

// Delete scan
router.delete('/:id', async (req, res) => {
  try {
    await Scan.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete scan' });
  }
});

module.exports = router;
