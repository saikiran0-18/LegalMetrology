const mongoose = require('mongoose');
const Rule = require('../models/Rule');
const RuleVersion = require('../models/RuleVersion');
const { centralRules, stateRules, ruleVersions } = require('../scripts/seedRules');

// Central rule evaluator imports
const rule06_1_a_Manufacturer = require('./rule06_1_a_Manufacturer');
const rule06_1_b_GenericName = require('./rule06_1_b_GenericName');
const rule06_1_c_NetQuantity = require('./rule06_1_c_NetQuantity');
const rule06_1_d_Date = require('./rule06_1_d_Date');
const rule06_1_da_UnitSalePrice = require('./rule06_1_da_UnitSalePrice');
const rule06_1_e_MRP = require('./rule06_1_e_MRP');
const rule06_1_f_Dimensions = require('./rule06_1_f_Dimensions');
const rule06_1_g_CountryOfOrigin = require('./rule06_1_g_CountryOfOrigin');
const rule06_2_ConsumerCare = require('./rule06_2_ConsumerCare');
const rule08_PrincipalDisplayPanel = require('./rule08_PrincipalDisplayPanel');
const rule09_FontHeight = require('./rule09_FontHeight');
const rule10_ECommerceDeclarations = require('./rule10_ECommerceDeclarations');
const rule12_6_ProhibitedWords = require('./rule12_6_ProhibitedWords');
const rule13_StandardMetricUnits = require('./rule13_StandardMetricUnits');

const centralEvaluatorMap = {
  rule06_1_a: rule06_1_a_Manufacturer,
  rule06_1_b: rule06_1_b_GenericName,
  rule06_1_c: rule06_1_c_NetQuantity,
  rule06_1_d: rule06_1_d_Date,
  rule06_1_da: rule06_1_da_UnitSalePrice,
  rule06_1_e: rule06_1_e_MRP,
  rule06_1_f: rule06_1_f_Dimensions,
  rule06_1_g: rule06_1_g_CountryOfOrigin,
  rule06_2: rule06_2_ConsumerCare,
  rule08: rule08_PrincipalDisplayPanel,
  rule09: rule09_FontHeight,
  rule10: rule10_ECommerceDeclarations,
  rule12_6: rule12_6_ProhibitedWords,
  rule13: rule13_StandardMetricUnits,
};

// Generic / State Evaluator Handlers
const stateEvaluators = {
  state_packer_registration: (extractedInfo, rule) => {
    const { manufacturer, address } = extractedInfo;
    const hasMfg = manufacturer && manufacturer !== 'Not detected';
    const hasAddr = address && address !== 'Not detected';
    const state = rule.stateName || 'State';

    if (hasMfg && hasAddr) {
      return {
        status: 'PASS',
        confidence: 0.95,
        detectedValue: `${manufacturer}, ${address}`,
        message: `Manufacturer name and premises address declared in accordance with ${rule.sourceDocument}. Valid for ${state} Controller verification.`,
        recommendation: `Verify registration certificate with Controller of Legal Metrology, ${state}.`,
        severity: rule.severity || 'HIGH'
      };
    } else if (hasMfg) {
      return {
        status: 'WARNING',
        confidence: 0.85,
        detectedValue: manufacturer,
        message: `Manufacturer named but complete premises address is missing. Required for ${state} Legal Metrology registration verification.`,
        recommendation: `Ensure complete premises address is declared on label for ${state} enforcement.`,
        severity: rule.severity || 'HIGH'
      };
    } else {
      return {
        status: 'FAIL',
        confidence: 0.95,
        detectedValue: 'Not detected',
        message: `Manufacturer details missing. Cannot verify ${state} Legal Metrology registration.`,
        recommendation: `Mandatory declaration of manufacturer/packer name and address under ${rule.sourceDocument}.`,
        severity: rule.severity || 'HIGH'
      };
    }
  },

  state_verification_stamping: (extractedInfo, rule) => {
    const { netQuantity } = extractedInfo;
    const hasQty = netQuantity && netQuantity !== 'Not detected';
    const state = rule.stateName || 'State';

    if (hasQty) {
      return {
        status: 'PASS',
        confidence: 0.95,
        detectedValue: netQuantity,
        message: `Net quantity declared in metric units (${netQuantity}) satisfying ${rule.title}. Equipment verification compliant.`,
        recommendation: `Ensure packaging batch verification records are logged for ${state} inspection.`,
        severity: rule.severity || 'MEDIUM'
      };
    } else {
      return {
        status: 'FAIL',
        confidence: 0.95,
        detectedValue: 'Not detected',
        message: `Net quantity not detected. Packaging measurement verification cannot be confirmed under ${rule.sourceDocument}.`,
        recommendation: `Declare net quantity verified with stamped weighing/measuring equipment.`,
        severity: rule.severity || 'MEDIUM'
      };
    }
  },

  state_consumer_redressal: (extractedInfo, rule) => {
    const { consumerCare } = extractedInfo;
    const hasCare = consumerCare && consumerCare !== 'Not detected';
    const state = rule.stateName || 'State';

    if (hasCare) {
      return {
        status: 'PASS',
        confidence: 0.95,
        detectedValue: consumerCare,
        message: `Consumer complaint contact points provided (${consumerCare}) accessible to ${state} consumers.`,
        recommendation: `Maintain nodal officer contact registry for state grievance redressal.`,
        severity: rule.severity || 'MEDIUM'
      };
    } else {
      return {
        status: 'WARNING',
        confidence: 0.90,
        detectedValue: 'Not detected',
        message: `Consumer care details not found. Regional consumer complaint cell declaration required under ${rule.sourceDocument}.`,
        recommendation: `Add contact telephone, email, and address for consumer complaints.`,
        severity: rule.severity || 'MEDIUM'
      };
    }
  }
};

/**
 * Fetch applicable rules dynamically based on:
 * 1. inspectionState
 * 2. productCategory
 * 3. inspectionDate (temporal version resolution)
 * 4. jurisdiction
 * 5. effectiveDates (effectiveFrom <= inspectionDate <= effectiveTo)
 */
const getApplicableRules = async ({ inspectionState, productCategory, inspectionDate = new Date() }) => {
  const targetDate = inspectionDate instanceof Date ? inspectionDate : new Date(inspectionDate);

  // 1. If MongoDB is connected, query RuleVersion collection
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    try {
      const versionQuery = {
        approvalStatus: 'Approved',
        effectiveFrom: { $lte: targetDate },
        $or: [
          { effectiveTo: null },
          { effectiveTo: { $gte: targetDate } }
        ]
      };

      if (productCategory && productCategory !== 'All') {
        versionQuery.$and = versionQuery.$and || [];
        versionQuery.$and.push({
          $or: [
            { productCategory: 'All' },
            { productCategory: productCategory }
          ]
        });
      }

      if (inspectionState && inspectionState !== 'All' && inspectionState !== 'Central (All India)') {
        versionQuery.$or = [
          { jurisdiction: 'Central' },
          { jurisdiction: 'State', stateName: inspectionState }
        ];
      } else {
        versionQuery.jurisdiction = 'Central';
      }

      // Sort by ruleId, effectiveFrom descending, version descending
      const versionDocs = await RuleVersion.find(versionQuery)
        .sort({ ruleId: 1, effectiveFrom: -1, version: -1 })
        .lean();

      if (versionDocs && versionDocs.length > 0) {
        // Deduplicate by ruleId (ensure exactly 1 active version per ruleId on this inspection date)
        const resolvedMap = new Map();
        for (const doc of versionDocs) {
          if (!resolvedMap.has(doc.ruleId)) {
            resolvedMap.set(doc.ruleId, {
              ruleId: doc.ruleId,
              ruleNumber: doc.ruleNumber,
              title: doc.title,
              description: doc.requirement,
              requirement: doc.requirement,
              jurisdiction: doc.jurisdiction,
              stateName: doc.stateName,
              productCategory: doc.productCategory,
              effectiveFrom: doc.effectiveFrom,
              effectiveTo: doc.effectiveTo,
              sourceDocument: doc.sourceDocument,
              sourceUrl: doc.sourceUrl,
              version: doc.version,
              approvalStatus: doc.approvalStatus,
              approvedBy: doc.approvedBy,
              approvedDate: doc.approvedDate,
              amendments: doc.amendments,
              status: doc.status,
              weight: doc.weight || 10,
              severity: doc.severity || 'MEDIUM',
              evaluatorKey: doc.evaluatorKey
            });
          }
        }
        return Array.from(resolvedMap.values());
      }
    } catch (err) {
      console.warn('Could not query rule versions from database, trying fallback:', err.message);
    }
  }

  // 2. In-memory multi-version fallback
  const inMemMap = new Map();
  const versionsToScan = Array.isArray(ruleVersions) && ruleVersions.length > 0 
    ? ruleVersions 
    : [...centralRules, ...stateRules];

  for (const v of versionsToScan) {
    if (v.approvalStatus && v.approvalStatus !== 'Approved') continue;
    const vEffFrom = new Date(v.effectiveFrom || '2011-04-01');
    const vEffTo = v.effectiveTo ? new Date(v.effectiveTo) : null;

    // Temporal validity check
    if (vEffFrom > targetDate) continue;
    if (vEffTo && vEffTo < targetDate) continue;

    // Jurisdiction check
    if (v.jurisdiction === 'State') {
      if (!inspectionState || inspectionState === 'All' || inspectionState === 'Central (All India)' || v.stateName !== inspectionState) {
        continue;
      }
    }

    // Category check
    if (productCategory && productCategory !== 'All' && v.productCategory !== 'All' && v.productCategory !== productCategory) {
      continue;
    }

    // Deduplicate by ruleId keeping newest effectiveFrom / version
    if (!inMemMap.has(v.ruleId) || inMemMap.get(v.ruleId).effectiveFrom < vEffFrom) {
      inMemMap.set(v.ruleId, {
        ruleId: v.ruleId,
        ruleNumber: v.ruleNumber,
        title: v.title,
        description: v.requirement || v.description,
        requirement: v.requirement || v.description,
        jurisdiction: v.jurisdiction,
        stateName: v.stateName,
        productCategory: v.productCategory || 'All',
        effectiveFrom: v.effectiveFrom,
        effectiveTo: v.effectiveTo,
        sourceDocument: v.sourceDocument,
        sourceUrl: v.sourceUrl,
        version: v.version || '1.0',
        approvalStatus: v.approvalStatus || 'Approved',
        approvedBy: v.approvedBy || 'Director of Legal Metrology',
        approvedDate: v.approvedDate || new Date('2011-03-01'),
        amendments: v.amendments || 'Statutory Enactment',
        status: v.status || 'Active',
        weight: v.weight || 10,
        severity: v.severity || 'MEDIUM',
        evaluatorKey: v.evaluatorKey
      });
    }
  }

  return Array.from(inMemMap.values());
};

/**
 * Evaluate compliance against dynamic list of rules
 */
const evaluateCompliance = async (extractedInfo, options = {}) => {
  const inspectionState = options.inspectionState || 'Central (All India)';
  const inspectionDate = options.inspectionDate ? new Date(options.inspectionDate) : new Date();
  const productCategory = extractedInfo.productCategory || 'General Packaged Commodity';

  let applicableRules = options.rules || null;

  // If rules were not directly passed, query dynamically from database
  if (!applicableRules) {
    applicableRules = await getApplicableRules({
      inspectionState,
      productCategory,
      inspectionDate
    });
  }

  // Fallback to central rules if DB returned empty or disconnected
  if (!applicableRules || applicableRules.length === 0) {
    applicableRules = Object.keys(centralEvaluatorMap).map(key => {
      const mod = centralEvaluatorMap[key];
      return {
        ruleId: mod.id,
        ruleNumber: mod.id.replace('RULE-', 'Rule ').replace(/-/g, '(') + ')',
        title: mod.title,
        description: mod.description,
        jurisdiction: 'Central',
        stateName: null,
        productCategory: 'All',
        sourceDocument: 'Legal Metrology (Packaged Commodities) Rules, 2011',
        sourceUrl: 'https://consumeraffairs.nic.in/acts-and-rules/legal-metrology/packaged-commodities-rules-2011',
        version: '2011.1',
        weight: mod.weight || 10,
        severity: 'HIGH',
        evaluatorKey: key
      };
    });
  }

  let totalWeight = 0;
  let deductions = 0;
  let highSeverityFails = 0;
  let mediumSeverityWarnings = 0;
  const ruleResults = [];

  for (const rule of applicableRules) {
    let evalResult = null;

    // 1. Check if evaluator exists in Central evaluators
    if (centralEvaluatorMap[rule.evaluatorKey]) {
      evalResult = centralEvaluatorMap[rule.evaluatorKey].evaluate(extractedInfo);
    } 
    // 2. Check if evaluator exists in State evaluators
    else if (stateEvaluators[rule.evaluatorKey]) {
      evalResult = stateEvaluators[rule.evaluatorKey](extractedInfo, rule);
    } 
    // 3. Fallback generic evaluator
    else {
      evalResult = {
        status: 'PASS',
        confidence: 0.9,
        detectedValue: 'Compliant',
        message: `Standard verified under ${rule.sourceDocument}.`,
        severity: rule.severity || 'LOW'
      };
    }

    const weight = rule.weight || 10;
    if (evalResult.status !== 'NOT_APPLICABLE') {
      totalWeight += weight;
    }

    const result = {
      ruleId: rule.ruleId,
      ruleNumber: rule.ruleNumber || rule.ruleId,
      ruleName: rule.title,
      requirement: rule.requirement || rule.description,
      jurisdiction: rule.jurisdiction || 'Central',
      stateName: rule.stateName || null,
      productCategory: rule.productCategory || 'All',
      sourceDocument: rule.sourceDocument || 'Legal Metrology Rules',
      sourceUrl: rule.sourceUrl || '',
      version: rule.version || '1.0',
      effectiveFrom: rule.effectiveFrom,
      effectiveTo: rule.effectiveTo,
      approvalStatus: rule.approvalStatus || 'Approved',
      approvedBy: rule.approvedBy || 'Director of Legal Metrology',
      approvedDate: rule.approvedDate || null,
      amendments: rule.amendments || '',
      status: evalResult.status,
      explanation: evalResult.message,
      recommendation: evalResult.recommendation || '',
      detectedValue: evalResult.detectedValue,
      severity: evalResult.severity || rule.severity || 'MEDIUM',
      weight
    };

    ruleResults.push(result);

    if (result.status === 'FAIL') {
      deductions += weight;
      if (result.severity === 'HIGH') {
        highSeverityFails++;
      }
    } else if (result.status === 'WARNING') {
      deductions += weight * 0.4;
      mediumSeverityWarnings++;
    }
  }

  // Calculate percentage score (0-100)
  const rawScore = totalWeight > 0 ? Math.max(0, Math.round(((totalWeight - deductions) / totalWeight) * 100)) : 100;
  
  let riskLevel = 'LOW';
  if (highSeverityFails >= 2 || rawScore < 60) {
    riskLevel = 'HIGH';
  } else if (highSeverityFails === 1 || mediumSeverityWarnings >= 2 || rawScore < 85) {
    riskLevel = 'MEDIUM';
  }

  return {
    score: rawScore,
    riskLevel,
    inspectionState,
    inspectionDate,
    productCategory,
    ruleResults
  };
};

module.exports = {
  evaluateCompliance,
  getApplicableRules,
  centralEvaluatorMap
};
