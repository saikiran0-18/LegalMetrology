module.exports = {
  id: 'RULE-06-1-DA',
  title: 'Rule 6(1)(da): Unit Sale Price (USP)',
  description: 'Unit Sale Price must be declared per g/ml for packages under 1kg/1L, per kg/L for packages over 1kg/1L, or per item for multi-piece commodity packs. Not required for single-piece apparel, electronics, and distinct non-weight units.',
  weight: 10,
  evaluate: (extractedInfo) => {
    const value = extractedInfo.unitSalePrice;
    const category = extractedInfo.productCategory || '';
    const qty = (extractedInfo.netQuantity || '').toLowerCase();

    // Check if category is Apparel & Textiles or single unit item
    const isApparelOrSingleItem = 
      category === 'Apparel & Textiles' || 
      category === 'Electronics & Appliances' ||
      /\b(1\s*(?:n|u|piece|pc|item|unit))\b/i.test(qty);

    if (isApparelOrSingleItem && (!value || value === 'Not detected')) {
      return {
        id: 'RULE-06-1-DA',
        status: 'NOT_APPLICABLE',
        severity: 'LOW',
        message: `Unit Sale Price is exempt for ${category || 'Single-Unit commodities'} (Rule 6(1)(da) applies primarily to goods sold by weight/measure or multi-packs).`,
        detectedValue: 'Exempt / Single Unit'
      };
    }

    if (value && value !== 'Not detected') {
      return {
        id: 'RULE-06-1-DA',
        status: 'PASS',
        message: 'Unit Sale Price is clearly declared.',
        detectedValue: value
      };
    }

    return {
      id: 'RULE-06-1-DA',
      status: 'WARNING',
      severity: 'MEDIUM',
      message: `Unit Sale Price (USP) was not detected. Mandatory for ${category || 'weighed commodities'} under Rule 6(1)(da).`,
      detectedValue: 'Not detected',
      recommendation: 'Declare Unit Sale Price (e.g. ₹0.50 per g or ₹120 per kg/L) alongside MRP.'
    };
  }
};
