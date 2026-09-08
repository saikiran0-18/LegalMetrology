module.exports = {
  id: 'RULE-06-1-G',
  title: 'Rule 6(1)(g): Country of Origin',
  description: 'Every package containing imported goods, or manufactured commodities, shall declare the Country of Origin or manufacture.',
  weight: 10,
  evaluate: (extractedInfo) => {
    const value = extractedInfo.countryOfOrigin;
    
    if (!value || value === 'Not detected') {
      return {
        id: 'RULE-06-1-G',
        status: 'WARNING',
        severity: 'MEDIUM',
        message: 'Country of Origin / Manufacture statement is missing.',
        detectedValue: 'Not detected',
        recommendation: 'Mention "Country of Origin: [Country]" or "Made in [Country]" prominently on the label as required under Rule 6(1)(g).'
      };
    }

    return {
      id: 'RULE-06-1-G',
      status: 'PASS',
      message: 'Country of Origin is declared.',
      detectedValue: value
    };
  }
};
