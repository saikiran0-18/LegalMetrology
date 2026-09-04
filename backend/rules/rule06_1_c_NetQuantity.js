module.exports = {
  id: 'RULE-06-1-C',
  title: 'Rule 6(1)(c): Net Quantity Declaration',
  description: 'Net quantity must be declared in standard SI units (g, kg, ml, L, m, N, U).',
  weight: 20,
  evaluate: (extractedInfo) => {
    const value = extractedInfo.netQuantity;
    
    if (!value || value === 'Not detected') {
      return {
        id: 'RULE-06-1-C',
        status: 'FAIL',
        severity: 'HIGH',
        message: 'Net quantity declaration is missing.',
        detectedValue: 'Not detected',
        recommendation: 'Declare the net quantity in standard units (e.g., g, kg, ml, L).'
      };
    }

    // Check if standard SI unit is used (Rule 13(5))
    const validUnits = ['g', 'kg', 'mg', 'ml', 'l', 'm', 'cm', 'n', 'u', 'pcs', 'pieces'];
    const hasValidUnit = validUnits.some(unit => value.toLowerCase().includes(unit));

    if (!hasValidUnit) {
      return {
        id: 'RULE-06-1-C',
        status: 'WARNING',
        severity: 'MEDIUM',
        message: 'Net quantity may not be using standard SI symbols.',
        detectedValue: value,
        recommendation: 'Ensure quantity uses standard SI abbreviations like g, kg, ml, L, or N for count.'
      };
    }

    return {
      id: 'RULE-06-1-C',
      status: 'PASS',
      message: 'Net quantity is declared properly.',
      detectedValue: value
    };
  }
};
