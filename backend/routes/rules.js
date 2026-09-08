const express = require('express');
const router = express.Router();
const Rule = require('../models/Rule');
const { seedRules, centralRules, stateRules } = require('../scripts/seedRules');

// Get all rules with filtering support
router.get('/', async (req, res) => {
  try {
    const { jurisdiction, stateName, productCategory, status } = req.query;
    const query = {};

    if (jurisdiction) query.jurisdiction = jurisdiction;
    if (stateName) query.stateName = stateName;
    if (productCategory && productCategory !== 'All') {
      query.$or = [{ productCategory: 'All' }, { productCategory }];
    }
    if (status) {
      query.status = status;
    } else {
      query.status = 'Active'; // default to active
    }

    let rules = await Rule.find(query).sort({ jurisdiction: 1, stateName: 1, ruleId: 1 }).lean();

    // Auto-seed if database is empty
    if (!rules || rules.length === 0) {
      await seedRules();
      rules = await Rule.find(query).sort({ jurisdiction: 1, stateName: 1, ruleId: 1 }).lean();
    }

    // Format output
    const formatted = rules.map(r => ({
      ruleId: r.ruleId,
      ruleNumber: r.ruleNumber,
      ruleName: r.title,
      requirement: r.description,
      jurisdiction: r.jurisdiction,
      stateName: r.stateName,
      productCategory: r.productCategory,
      effectiveFrom: r.effectiveFrom,
      effectiveTo: r.effectiveTo,
      status: r.status,
      sourceDocument: r.sourceDocument,
      sourceUrl: r.sourceUrl,
      lastVerifiedDate: r.lastVerifiedDate,
      version: r.version,
      weight: r.weight,
      severity: r.severity
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Fetch rules error:', error);
    // In-memory fallback
    const all = [...centralRules, ...stateRules];
    const { jurisdiction, stateName } = req.query;
    let filtered = all;
    if (jurisdiction) {
      filtered = filtered.filter(r => r.jurisdiction.toLowerCase() === jurisdiction.toLowerCase());
    }
    if (stateName) {
      filtered = filtered.filter(r => !r.stateName || r.stateName.toLowerCase() === stateName.toLowerCase());
    }
    res.json(filtered.map(r => ({
      ruleId: r.ruleId,
      ruleNumber: r.ruleNumber,
      ruleName: r.title,
      requirement: r.description,
      jurisdiction: r.jurisdiction,
      stateName: r.stateName,
      productCategory: r.productCategory,
      sourceDocument: r.sourceDocument,
      sourceUrl: r.sourceUrl,
      version: r.version,
      weight: r.weight,
      severity: r.severity
    })));
  }
});

// Get supported states with active rules
router.get('/states', async (req, res) => {
  try {
    const states = await Rule.distinct('stateName', {
      jurisdiction: 'State',
      stateName: { $ne: null },
      status: 'Active'
    });

    const defaultStates = ['Telangana', 'Maharashtra', 'Karnataka', 'Tamil Nadu', 'Delhi', 'Gujarat'];
    const combined = Array.from(new Set([...defaultStates, ...(states || [])])).sort();

    res.json(combined);
  } catch (err) {
    res.json(['Telangana', 'Maharashtra', 'Karnataka', 'Tamil Nadu', 'Delhi', 'Gujarat']);
  }
});

// Trigger seed / refresh
router.post('/seed', async (req, res) => {
  try {
    const result = await seedRules();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to seed rules: ' + err.message });
  }
});

// Create or update a rule
router.post('/', async (req, res) => {
  try {
    const ruleData = req.body;
    if (!ruleData.ruleId || !ruleData.title || !ruleData.description) {
      return res.status(400).json({ error: 'ruleId, title, and description are required.' });
    }

    const rule = await Rule.findOneAndUpdate(
      { ruleId: ruleData.ruleId },
      { $set: ruleData },
      { upsert: true, new: true }
    );

    res.json({ success: true, rule });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
