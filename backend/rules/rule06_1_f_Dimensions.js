module.exports = {
  id: 'RULE-06-1-F',
  title: 'Rule 6(1)(f): Dimensions and Sizes of Commodity',
  description: 'Where sizes of the commodity in the package are relevant (e.g. textiles, sheets, cables, garments), dimensions (length, width, diameter) must be declared in metric units.',
  weight: 5,
  evaluate: (extractedInfo) => {
    const value = extractedInfo.dimensions;
    const productName = (extractedInfo.productName || '').toLowerCase();
    
    // Check if product is typically dimensional
    const isDimensional = /t-?shirt|shirt|pant|towel|bedsheet|cable|rope|tape|cloth|curtain|shoe|footwear|sock/i.test(productName);
    
    if (isDimensional && (!value || value === 'Not detected')) {
      return {
        id: 'RULE-06-1-F',
        status: 'WARNING',
        severity: 'LOW',
        message: 'Dimensions/size specification not explicitly detected for this type of commodity.',
        detectedValue: 'Not detected',
        recommendation: 'Declare standard dimensions (e.g. Length x Width in cm or m, or standard size) as mandated by Rule 6(1)(f).'
      };
    }

    if (value && value !== 'Not detected') {
      return {
        id: 'RULE-06-1-F',
        status: 'PASS',
        message: 'Dimensions / size details are declared.',
        detectedValue: value
      };
    }

    return {
      id: 'RULE-06-1-F',
      status: 'NOT_APPLICABLE',
      message: 'Dimensions not required for standard non-dimensional commodity.',
      detectedValue: 'N/A'
    };
  }
};
