const express = require('express');
const router = express.Router();
const Scan = require('../models/Scan');
const { requireAuth } = require('../middleware/auth');

// Protect all history endpoints
router.use(requireAuth);

// Get all scans
router.get('/', async (req, res) => {
  try {
    const scans = await Scan.find().sort({ timestamp: -1 });
    res.json(scans);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Get scan by ID
router.get('/:id', async (req, res) => {
  try {
    const scan = await Scan.findById(req.params.id);
    if (!scan) return res.status(404).json({ error: 'Scan not found' });
    res.json(scan);
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
