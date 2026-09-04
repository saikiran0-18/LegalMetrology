module.exports = {
  ruleId: 'RULE-CARE-004',
  ruleName: 'Consumer Care Details',
  requirement: 'Name, address, telephone number, e-mail address of the person or office to be contacted in case of consumer complaints.',
  weight: 20,
  evaluate: (extractedInfo) => {
    const value = extractedInfo.consumerCare;
    const isDetected = value && value !== 'Not detected';
    
    return {
      ruleId: 'RULE-CARE-004',
      ruleName: 'Consumer Care Details',
      requirement: 'Name, address, telephone number, e-mail address of the person or office to be contacted in case of consumer complaints.',
      detectedValue: value,
      status: isDetected ? 'PASS' : 'FAIL',
      severity: 'HIGH',
      explanation: isDetected 
        ? 'Consumer care information found.' 
        : 'Consumer care contact details are missing.',
      recommendation: isDetected 
        ? 'No action required.' 
        : 'Ensure consumer care email or phone number is clearly stated.',
      confidence: 0.8
    };
  }
};
