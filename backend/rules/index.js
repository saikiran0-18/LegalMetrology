const rule06_1_a_Manufacturer = require('./rule06_1_a_Manufacturer');
const rule06_1_b_GenericName = require('./rule06_1_b_GenericName');
const rule06_1_c_NetQuantity = require('./rule06_1_c_NetQuantity');
const rule06_1_d_Date = require('./rule06_1_d_Date');
const rule06_1_e_MRP = require('./rule06_1_e_MRP');
const rule12_6_ProhibitedWords = require('./rule12_6_ProhibitedWords');
const rule06_2_ConsumerCare = require('./rule06_2_ConsumerCare');

const rules = [
  rule06_1_a_Manufacturer,
  rule06_1_b_GenericName,
  rule06_1_c_NetQuantity,
  rule06_1_d_Date,
  rule06_1_e_MRP,
  rule12_6_ProhibitedWords,
  rule06_2_ConsumerCare
];

const evaluateCompliance = (extractedInfo) => {
  let score = 100;
  let riskLevel = 'LOW';
  const ruleResults = [];

  for (const rule of rules) {
    const evalResult = rule.evaluate(extractedInfo);
    
    // Map internal rule fields to what the frontend expects
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
      score -= rule.weight || 15; // Deduct the specified weight
      if (result.severity === 'HIGH') {
        riskLevel = 'HIGH';
      } else if (riskLevel === 'LOW' && result.severity === 'MEDIUM') {
        riskLevel = 'MEDIUM';
      }
    } else if (result.status === 'WARNING') {
      score -= (rule.weight || 15) / 2; // Deduct half weight for warnings
      if (riskLevel === 'LOW') {
        riskLevel = 'MEDIUM';
      }
    }
  }

  score = Math.max(0, Math.floor(score)); // Ensure score is not negative and is integer

  return {
    score,
    riskLevel,
    ruleResults
  };
};

module.exports = {
  evaluateCompliance,
  rules
};
