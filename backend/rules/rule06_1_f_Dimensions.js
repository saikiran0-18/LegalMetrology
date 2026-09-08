module.exports = {
  id: 'RULE-06-1-F',
  title: 'Rule 6(1)(f): Dimensions and Sizes of Commodity',
  description: 'Where sizes or dimensions are relevant to the consumer (e.g. textiles, garments, footwear, bedsheets, cables), dimensions (length, width, size) must be declared in metric units. Not applicable to groceries or liquids.',
  weight: 5,
  evaluate: (extractedInfo) => {
    const value = extractedInfo.dimensions;
    const category = extractedInfo.productCategory || '';

    // If Food & Beverages or Cosmetics, dimensions are not legally required
    if (category === 'Food & Beverages' || category === 'Cosmetics & Personal Care') {
      return {
        id: 'RULE-06-1-F',
        status: 'NOT_APPLICABLE',
        severity: 'LOW',
        message: `Dimensions are not applicable to ${category} (goods sold by weight or volume under Rule 12).`,
        detectedValue: 'N/A'
      };
    }

    // For Apparel & Textiles or dimensional goods
    if (category === 'Apparel & Textiles') {
      if (!value || value === 'Not detected') {
        return {
          id: 'RULE-06-1-F',
          status: 'WARNING',
          severity: 'MEDIUM',
          message: 'Dimensions/size specification not detected. Mandatory for Apparel & Textiles under Rule 6(1)(f).',
          detectedValue: 'Not detected',
          recommendation: 'Declare size (e.g. S/M/L, chest cm) or dimensions (Length x Width in cm or m) on apparel labels.'
        };
      }
      return {
        id: 'RULE-06-1-F',
        status: 'PASS',
        message: 'Dimensions / size details are declared.',
        detectedValue: value
      };
    }

    // For other categories
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
