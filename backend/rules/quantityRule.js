module.exports = {
  ruleId: 'RULE-QTY-002',
  ruleName: 'Net Quantity Declaration',
  requirement: 'The net quantity of the commodity contained in the package must be declared.',
  weight: 25,
  evaluate: (extractedInfo) => {
    const value = extractedInfo.netQuantity;
    const isDetected = value && value !== 'Not detected';
    
    return {
      ruleId: 'RULE-QTY-002',
      ruleName: 'Net Quantity Declaration',
      requirement: 'The net quantity of the commodity contained in the package must be declared.',
      detectedValue: value,
      status: isDetected ? 'PASS' : 'FAIL',
      severity: 'HIGH',
      explanation: isDetected 
        ? 'Net quantity declaration found.' 
        : 'Net quantity declaration is missing or obscured.',
      recommendation: isDetected 
        ? 'No action required.' 
        : 'Verify and add the net quantity in standard units (e.g., g, kg, ml, L).',
      confidence: 0.9
    };
  }
};
