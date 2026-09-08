module.exports = {
  id: 'RULE-13',
  title: 'Rule 13: Standard Units of Weight, Measure or Number',
  description: 'Declarations of quantity shall be expressed only in units of the metric system (SI units): g, kg, mL, L, m, cm, mm, or N (number/units). Obsolete, imperial, or fractional non-metric units are prohibited.',
  weight: 10,
  evaluate: (extractedInfo) => {
    const qty = (extractedInfo.netQuantity || '').toLowerCase();
    
    if (!qty || qty === 'not detected') {
      return {
        id: 'RULE-13',
        status: 'FAIL',
        severity: 'HIGH',
        message: 'No metric quantity detected on the packaging.',
        detectedValue: 'Not detected',
        recommendation: 'Declare quantity strictly using SI metric units (g, kg, mL, L, or N/U for piece counts).'
      };
    }

    // Check for prohibited non-metric terms (lbs, oz, feet, yards, inches, tola)
    const prohibitedImperial = /\b(lbs?|ounces?|oz|feet|ft|inches?|in\b|yards?|yd|tola|seer|pao)\b/i;
    if (prohibitedImperial.test(qty)) {
      return {
        id: 'RULE-13',
        status: 'FAIL',
        severity: 'HIGH',
        message: `Non-standard or imperial unit detected (${qty}). Rule 13 strictly prohibits non-metric units.`,
        detectedValue: qty,
        recommendation: 'Replace non-metric expressions with standard SI metric units (g, kg, mL, L).'
      };
    }

    // Check for valid metric units
    const validMetric = /\b(g|gm|gms|gram|grams|kg|kgs|kilogram|kilograms|ml|mls|millilitre|milliliter|l|ltr|litre|liter|m|meter|cm|mm|n|u|pcs?|units?)\b/i;
    if (validMetric.test(qty)) {
      return {
        id: 'RULE-13',
        status: 'PASS',
        message: 'Quantity is expressed using standard metric SI units.',
        detectedValue: qty
      };
    }

    return {
      id: 'RULE-13',
      status: 'WARNING',
      severity: 'MEDIUM',
      message: `Quantity format (${qty}) requires verification against Second Schedule standard units.`,
      detectedValue: qty,
      recommendation: 'Ensure metric symbols follow standard notation (e.g. "g" instead of "gms", "mL" or "L" for liquids).'
    };
  }
};
