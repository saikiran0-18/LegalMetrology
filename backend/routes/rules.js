const express = require('express');
const router = express.Router();
const Rule = require('../models/Rule');
const RuleVersion = require('../models/RuleVersion');
const { seedRules, centralRules, stateRules, ruleVersions } = require('../scripts/seedRules');
const { getApplicableRules } = require('../rules');

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
      severity: r.severity,
      approvalStatus: r.approvalStatus || 'Approved',
      approvedBy: r.approvedBy || 'Director of Legal Metrology',
      approvedDate: r.approvedDate,
      amendments: r.amendments
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
      severity: r.severity,
      approvalStatus: r.approvalStatus || 'Approved',
      approvedBy: r.approvedBy || 'Director of Legal Metrology',
      approvedDate: r.approvedDate,
      amendments: r.amendments
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

// Simulate rule version resolution as of any specified inspection date
router.get('/simulate', async (req, res) => {
  try {
    const { date, state, category } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    const rules = await getApplicableRules({
      inspectionState: state || 'Central (All India)',
      productCategory: category || 'All',
      inspectionDate: targetDate
    });

    res.json({
      simulatedDate: targetDate,
      state: state || 'Central (All India)',
      category: category || 'All',
      totalRules: rules.length,
      rules
    });
  } catch (err) {
    res.status(500).json({ error: 'Simulation failed: ' + err.message });
  }
});

// Get version history list across all rules (summary)
router.get('/history', async (req, res) => {
  try {
    const { ruleId, jurisdiction, stateName } = req.query;
    let query = {};
    if (ruleId) query.ruleId = ruleId;
    if (jurisdiction) query.jurisdiction = jurisdiction;
    if (stateName) query.stateName = stateName;

    let versions = [];
    try {
      versions = await RuleVersion.find(query).sort({ ruleId: 1, effectiveFrom: -1, version: -1 }).lean();
    } catch (dbErr) {
      console.warn('DB query for history failed, using fallback:', dbErr.message);
    }

    if (!versions || versions.length === 0) {
      versions = ruleVersions;
      if (ruleId) versions = versions.filter(v => v.ruleId === ruleId);
      if (jurisdiction) versions = versions.filter(v => v.jurisdiction === jurisdiction);
      if (stateName) versions = versions.filter(v => v.stateName === stateName);
    }

    // Group versions by ruleId
    const grouped = {};
    const now = new Date();

    for (const v of versions) {
      if (!grouped[v.ruleId]) {
        grouped[v.ruleId] = {
          ruleId: v.ruleId,
          ruleNumber: v.ruleNumber,
          title: v.title,
          jurisdiction: v.jurisdiction,
          stateName: v.stateName,
          productCategory: v.productCategory,
          totalVersions: 0,
          currentVersion: null,
          previousVersions: [],
          futureScheduledVersions: [],
          amendments: [],
          sourceDocuments: []
        };
      }

      const g = grouped[v.ruleId];
      g.totalVersions++;

      const effFrom = new Date(v.effectiveFrom);
      const effTo = v.effectiveTo ? new Date(v.effectiveTo) : null;

      // Classify version
      if (effFrom > now) {
        g.futureScheduledVersions.push(v);
      } else if (effTo && effTo < now) {
        g.previousVersions.push(v);
      } else {
        // Active today
        if (!g.currentVersion || new Date(g.currentVersion.effectiveFrom) < effFrom) {
          g.currentVersion = v;
        }
      }

      // Add amendments if present
      if (v.amendments && !g.amendments.includes(v.amendments)) {
        g.amendments.push(v.amendments);
      }

      // Add source document if present
      if (v.sourceDocument && !g.sourceDocuments.some(s => s.title === v.sourceDocument)) {
        g.sourceDocuments.push({
          title: v.sourceDocument,
          url: v.sourceUrl,
          version: v.version
        });
      }
    }

    res.json(Object.values(grouped));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rule version history: ' + err.message });
  }
});

// Get full version timeline & details for a specific rule ID
router.get('/history/:ruleId', async (req, res) => {
  try {
    const { ruleId } = req.params;
    let versions = [];

    try {
      versions = await RuleVersion.find({ ruleId }).sort({ effectiveFrom: -1, version: -1 }).lean();
    } catch (dbErr) {
      console.warn('DB query for specific rule history failed, using fallback:', dbErr.message);
    }

    if (!versions || versions.length === 0) {
      versions = ruleVersions.filter(v => v.ruleId === ruleId);
    }

    if (!versions || versions.length === 0) {
      return res.status(404).json({ error: `No rule history found for rule ID ${ruleId}` });
    }

    const now = new Date();
    let currentVersion = null;
    const previousVersions = [];
    const futureScheduledVersions = [];
    const amendments = [];
    const sourceDocuments = [];

    for (const v of versions) {
      const effFrom = new Date(v.effectiveFrom);
      const effTo = v.effectiveTo ? new Date(v.effectiveTo) : null;

      if (effFrom > now) {
        futureScheduledVersions.push(v);
      } else if (effTo && effTo < now) {
        previousVersions.push(v);
      } else {
        if (!currentVersion || new Date(currentVersion.effectiveFrom) < effFrom) {
          currentVersion = v;
        }
      }

      if (v.amendments) {
        amendments.push({
          version: v.version,
          amendmentText: v.amendments,
          effectiveFrom: v.effectiveFrom,
          approvedBy: v.approvedBy,
          approvedDate: v.approvedDate
        });
      }

      if (v.sourceDocument && !sourceDocuments.some(s => s.title === v.sourceDocument)) {
        sourceDocuments.push({
          title: v.sourceDocument,
          url: v.sourceUrl,
          version: v.version
        });
      }
    }

    res.json({
      ruleId,
      ruleNumber: versions[0].ruleNumber,
      title: versions[0].title,
      jurisdiction: versions[0].jurisdiction,
      stateName: versions[0].stateName,
      productCategory: versions[0].productCategory,
      totalVersions: versions.length,
      currentVersion,
      previousVersions,
      futureScheduledVersions,
      amendments,
      sourceDocuments,
      allVersions: versions
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rule history: ' + err.message });
  }
});

// Create / Gazette a new rule version (Never deletes previous versions)
router.post('/versions', async (req, res) => {
  try {
    const {
      ruleId,
      version,
      ruleNumber,
      title,
      requirement,
      jurisdiction = 'Central',
      stateName = null,
      productCategory = 'All',
      effectiveFrom,
      effectiveTo = null,
      sourceDocument,
      sourceUrl,
      approvalStatus = 'Approved',
      approvedBy,
      approvedDate = new Date(),
      amendments,
      weight = 10,
      severity = 'MEDIUM',
      evaluatorKey
    } = req.body;

    if (!ruleId || !version || !requirement || !effectiveFrom || !sourceDocument) {
      return res.status(400).json({
        error: 'Missing required version fields: ruleId, version, requirement, effectiveFrom, sourceDocument are mandatory.'
      });
    }

    // Check if version already exists
    const existing = await RuleVersion.findOne({ ruleId, version });
    if (existing) {
      return res.status(409).json({
        error: `Rule version ${version} for rule ${ruleId} already exists. Historical versions cannot be overwritten. Propose a new incremented version number.`
      });
    }

    // If new version takes effect immediately, cap previous active version's effectiveTo to avoid overlap
    const effFromDate = new Date(effectiveFrom);
    await RuleVersion.updateMany(
      {
        ruleId,
        effectiveTo: null,
        effectiveFrom: { $lt: effFromDate }
      },
      {
        $set: { effectiveTo: new Date(effFromDate.getTime() - 1000) }
      }
    );

    const newVersionDoc = new RuleVersion({
      ruleId,
      version,
      ruleNumber: ruleNumber || ruleId,
      title: title || requirement.substring(0, 50),
      requirement,
      jurisdiction,
      stateName,
      productCategory,
      effectiveFrom: effFromDate,
      effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
      sourceDocument,
      sourceUrl,
      approvalStatus,
      approvedBy: approvedBy || 'Director of Legal Metrology',
      approvedDate: new Date(approvedDate),
      amendments: amendments || `Version ${version} statutory gazette notification`,
      weight,
      severity,
      evaluatorKey: evaluatorKey || 'rule06_1_a'
    });

    await newVersionDoc.save();

    // If active now, synchronize Master Rule entry
    const now = new Date();
    if (effFromDate <= now && (!effectiveTo || new Date(effectiveTo) >= now)) {
      await Rule.findOneAndUpdate(
        { ruleId },
        {
          $set: {
            version,
            title: newVersionDoc.title,
            description: newVersionDoc.requirement,
            effectiveFrom: newVersionDoc.effectiveFrom,
            effectiveTo: newVersionDoc.effectiveTo,
            sourceDocument: newVersionDoc.sourceDocument,
            sourceUrl: newVersionDoc.sourceUrl,
            approvalStatus: newVersionDoc.approvalStatus,
            approvedBy: newVersionDoc.approvedBy,
            approvedDate: newVersionDoc.approvedDate,
            amendments: newVersionDoc.amendments,
            lastVerifiedDate: now
          }
        },
        { upsert: true }
      );
    }

    res.status(201).json({
      success: true,
      message: `Version ${version} for rule ${ruleId} gazetted and archived successfully.`,
      version: newVersionDoc
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create rule version: ' + err.message });
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

module.exports = router;
