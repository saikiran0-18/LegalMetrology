module.exports = {
  id: 'RULE-06-1-DA',
  title: 'Rule 6(1)(da): Unit Sale Price (USP)',
  description: 'Unit Sale Price must be declared per g/ml for packages under 1kg/1L, per kg/L for packages over 1kg/1L, or per number for multi-piece commodity packs. Not applicable to single-unit non-weight retail items like garments.',
  weight: 10,
  evaluate: (extractedInfo) => {
    const value = extractedInfo.unitSalePrice;
    const productName = (extractedInfo.productName || '').toLowerCase();
    const qty = (extractedInfo.netQuantity || '').toLowerCase();

    // 1. Check if item is single-piece apparel/garment/footwear/electronics where USP is identical to MRP or exempt
    const isSingleCountGarmentOrItem = 
      /t-?shirt|shirt|pant|trouser|jeans|dress|saree|garment|jacket|hoodie|sock|footwear|shoe|sandal|watch|belt|wallet|mobile|cable|earphone|headphone|bottle\b|pen\b/i.test(productName) ||
      (/\b(1\s*(?:n|u|piece|pc|item|unit))\b/i.test(qty) && !/\b(g|gm|kg|ml|ltr|litre|liter)\b/i.test(qty));

    if (isSingleCountGarmentOrItem && (!value || value === 'Not detected')) {
      return {
        id: 'RULE-06-1-DA',
        status: 'NOT_APPLICABLE',
        severity: 'LOW',
        message: 'Unit Sale Price (USP) is not required for single-count retail commodities (e.g. single T-shirt/garment) where net quantity is 1 unit and equals the total package.',
        detectedValue: 'Exempt / Single Unit'
      };
    }

    // 2. If USP is present
    if (value && value !== 'Not detected') {
      return {
        id: 'RULE-06-1-DA',
        status: 'PASS',
        message: 'Unit Sale Price is clearly declared.',
        detectedValue: value
      };
    }

    // 3. For grocery, food, chemical, commodity, multi-pack, or weighed/volume products, USP is mandatory
    return {
      id: 'RULE-06-1-DA',
      status: 'WARNING',
      severity: 'MEDIUM',
      message: 'Unit Sale Price (USP) was not detected on this commodity package.',
      detectedValue: 'Not detected',
      recommendation: 'As per Legal Metrology (Packaged Commodities) Rules, declare Unit Sale Price (e.g. ₹0.50 per g or ₹2.00 per piece) alongside MRP.'
    };
  }
};
