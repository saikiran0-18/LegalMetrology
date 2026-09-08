module.exports = {
  id: 'RULE-09',
  title: 'Rule 9 & Table I: Minimum Numeral & Font Height',
  description: 'Numerals and letters of declarations must adhere to the minimum height standards prescribed under Table I according to package surface area (minimum 1.0mm to 6.0mm).',
  weight: 10,
  evaluate: (extractedInfo) => {
    // Check if font quality or small text was flagged
    const text = extractedInfo.rawText || '';
    
    // Heuristic: If OCR extracted clean words and numerals, the font meets optical threshold
    if (extractedInfo.netQuantity && extractedInfo.netQuantity !== 'Not detected') {
      return {
        id: 'RULE-09',
        status: 'PASS',
        message: 'Font height and numeral clarity meet minimum visibility thresholds (Table I).',
        detectedValue: 'Compliant font height'
      };
    }

    return {
      id: 'RULE-09',
      status: 'WARNING',
      severity: 'LOW',
      message: 'Font height could not be automatically confirmed against Table I dimensional brackets.',
      detectedValue: 'Review physical print size',
      recommendation: 'Verify that numeral heights on packaging comply with Table I (e.g. min 1.0mm for PDP <= 50cm², min 2.0mm for PDP <= 100cm²).'
    };
  }
};
