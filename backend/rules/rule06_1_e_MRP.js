module.exports = {
  id: 'RULE-06-1-E',
  title: 'Rule 6(1)(e): Maximum Retail Price (MRP)',
  description: 'MRP must be declared inclusive of all taxes.',
  weight: 20,
  evaluate: (extractedInfo) => {
    const value = extractedInfo.mrp;
    
    if (!value || value === 'Not detected') {
      return {
        id: 'RULE-06-1-E',
        status: 'FAIL',
        severity: 'HIGH',
        message: 'MRP declaration is missing.',
        detectedValue: 'Not detected',
        recommendation: 'Every package shall bear the MRP inclusive of all taxes.'
      };
    }

    return {
      id: 'RULE-06-1-E',
      status: 'PASS',
      message: 'MRP is declared.',
      detectedValue: value
    };
  }
};
