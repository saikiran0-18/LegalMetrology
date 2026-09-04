module.exports = {
  id: 'RULE-06-1-B',
  title: 'Rule 6(1)(b): Generic or Common Name',
  description: 'Common or generic name of the commodity must be declared.',
  weight: 20,
  evaluate: (extractedInfo) => {
    const value = extractedInfo.productName;
    
    if (!value || value === 'Not detected') {
      return {
        id: 'RULE-06-1-B',
        status: 'FAIL',
        severity: 'HIGH',
        message: 'Product common/generic name is missing.',
        detectedValue: 'Not detected',
        recommendation: 'Clearly declare the generic or common name of the product on the package.'
      };
    }

    return {
      id: 'RULE-06-1-B',
      status: 'PASS',
      message: 'Product name is declared.',
      detectedValue: value
    };
  }
};
