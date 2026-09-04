module.exports = {
  ruleId: 'RULE-COO-005',
  ruleName: 'Country of Origin',
  requirement: 'Name of the country of origin or manufacture or assembly shall be mentioned on the package.',
  weight: 10,
  evaluate: (extractedInfo) => {
    const value = extractedInfo.countryOfOrigin;
    const isDetected = value && value !== 'Not detected';
    
    return {
      ruleId: 'RULE-COO-005',
      ruleName: 'Country of Origin',
      requirement: 'Name of the country of origin or manufacture or assembly shall be mentioned on the package.',
      detectedValue: value,
      status: isDetected ? 'PASS' : 'WARNING', // Giving warning since some products might be domestic and have different rules depending on category
      severity: 'MEDIUM',
      explanation: isDetected 
        ? 'Country of origin found.' 
        : 'Country of origin is not detected. Required for imported products.',
      recommendation: isDetected 
        ? 'No action required.' 
        : 'If the product is imported, ensure Country of Origin is clearly stated.',
      confidence: 0.8
    };
  }
};
