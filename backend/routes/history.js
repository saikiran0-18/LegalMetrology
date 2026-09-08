const express = require('express');
const router = express.Router();
const path = require('path');
const Scan = require('../models/Scan');
const { requireAuth } = require('../middleware/auth');

// Protect all history endpoints
router.use(requireAuth);

const normalizeScan = (doc) => {
  if (!doc) return doc;
  const s = doc.toObject ? doc.toObject() : { ...doc };
  if (s.imagePath) {
    const filename = path.basename(s.imagePath);
    s.imagePath = `/uploads/${filename}`;
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

    // Fallback: If scan was created prior to readability module, compute on first load
    if (!scan.readabilityAssessments || scan.readabilityAssessments.length === 0) {
      try {
        const { assessDeclarationReadability } = require('../services/readabilityService');
        const path = require('path');
        let imgPath = scan.imagePath;
        if (!path.isAbsolute(imgPath)) {
          imgPath = path.join(__dirname, '..', scan.imagePath);
        }
        scan.readabilityAssessments = await assessDeclarationReadability(imgPath, scan.extractedInfo || {}, scan.calibration?.pixelsPerMm || null);
        await scan.save();
      } catch (err) {
        console.warn('Lazy readability evaluation warning:', err.message);
      }
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
