module.exports = {
  ruleId: 'RULE-DATE-003',
  ruleName: 'Manufacturing / Packing Date',
  requirement: 'The month and year in which the commodity is manufactured, packed or pre-packed shall be declared.',
  weight: 20,
  evaluate: (extractedInfo) => {
    const value = extractedInfo.manufacturingDate;
    const isDetected = value && value !== 'Not detected';
    
    return {
      ruleId: 'RULE-DATE-003',
      ruleName: 'Manufacturing / Packing Date',
      requirement: 'The month and year in which the commodity is manufactured, packed or pre-packed shall be declared.',
      detectedValue: value,
      status: isDetected ? 'PASS' : 'FAIL',
      severity: 'HIGH',
      explanation: isDetected 
        ? 'Date declaration found.' 
        : 'Manufacturing or packing date is missing.',
      recommendation: isDetected 
        ? 'No action required.' 
        : 'Add the month and year of manufacturing/packing.',
      confidence: 0.85
    };
  }
};
