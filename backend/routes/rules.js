const express = require('express');
const router = express.Router();
const { rules } = require('../rules');

// Get all rules (from memory since they are defined in code)
router.get('/', (req, res) => {
  try {
    // Return the hardcoded rules from our engine
    const rulesList = rules.map(r => ({
      ruleId: r.id,
      ruleName: r.title,
      requirement: r.description,
      weight: r.weight
    }));
    res.json(rulesList);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch rules' });
  }
});

module.exports = router;
