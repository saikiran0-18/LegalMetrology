module.exports = {
  ruleId: 'RULE-MRP-001',
  ruleName: 'Maximum Retail Price (MRP) Declaration',
  requirement: 'Every package shall bear the Maximum Retail Price (MRP) inclusive of all taxes.',
  weight: 25,
  evaluate: (extractedInfo) => {
    const value = extractedInfo.mrp;
    const isDetected = value && value !== 'Not detected';
    
    return {
      ruleId: 'RULE-MRP-001',
      ruleName: 'Maximum Retail Price (MRP) Declaration',
      requirement: 'Every package shall bear the Maximum Retail Price (MRP) inclusive of all taxes.',
      detectedValue: value,
      status: isDetected ? 'PASS' : 'FAIL',
      severity: 'HIGH',
      explanation: isDetected 
        ? 'MRP declaration found on the label.' 
        : 'MRP declaration is missing or not clearly legible on the label.',
      recommendation: isDetected 
        ? 'No action required.' 
        : 'Ensure the MRP is printed clearly in the format "MRP Rs. XX.XX (incl. of all taxes)".',
      confidence: 0.9
    };
  }
};
