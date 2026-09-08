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

const rules = [
  rule06_1_a_Manufacturer,
  rule06_1_b_GenericName,
  rule06_1_c_NetQuantity,
  rule06_1_d_Date,
  rule06_1_da_UnitSalePrice,
  rule06_1_e_MRP,
  rule06_1_f_Dimensions,
  rule06_1_g_CountryOfOrigin,
  rule06_2_ConsumerCare,
  rule08_PrincipalDisplayPanel,
  rule09_FontHeight,
  rule10_ECommerceDeclarations,
  rule12_6_ProhibitedWords,
  rule13_StandardMetricUnits
];

const evaluateCompliance = (extractedInfo) => {
  let totalWeight = 0;
  let deductions = 0;
  let highSeverityFails = 0;
  let mediumSeverityWarnings = 0;
  const ruleResults = [];

  for (const rule of rules) {
    const evalResult = rule.evaluate(extractedInfo);
    const weight = rule.weight || 10;
    
    // Skip not applicable rules from weight calculations
    if (evalResult.status !== 'NOT_APPLICABLE') {
      totalWeight += weight;
    }

    const result = {
      ruleId: rule.id,
      ruleName: rule.title,
      requirement: rule.description,
      status: evalResult.status,
      explanation: evalResult.message,
      recommendation: evalResult.recommendation,
      detectedValue: evalResult.detectedValue,
      severity: evalResult.severity
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
    ruleResults
  };
};

module.exports = {
  evaluateCompliance,
  rules
};
