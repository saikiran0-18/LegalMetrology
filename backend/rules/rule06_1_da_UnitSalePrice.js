module.exports = {
  id: 'RULE-06-1-DA',
  title: 'Rule 6(1)(da): Unit Sale Price (USP)',
  description: 'Unit Sale Price must be declared per g/ml for packages under 1kg/1L, and per kg/L for packages over 1kg/1L, or per number for commodities sold by count.',
  weight: 10,
  evaluate: (extractedInfo) => {
    const value = extractedInfo.unitSalePrice;
    
    if (!value || value === 'Not detected') {
      return {
        id: 'RULE-06-1-DA',
        status: 'WARNING',
        severity: 'MEDIUM',
        message: 'Unit Sale Price (USP) was not detected on the package.',
        detectedValue: 'Not detected',
        recommendation: 'As per 2021/2022 Legal Metrology amendments, declare Unit Sale Price (e.g. ₹0.50 per g or ₹2.00 per piece) clearly alongside MRP.'
      };
    }

    return {
      id: 'RULE-06-1-DA',
      status: 'PASS',
      message: 'Unit Sale Price is clearly declared.',
      detectedValue: value
    };
  }
};
