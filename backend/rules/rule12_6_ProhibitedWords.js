module.exports = {
  id: 'RULE-12-6',
  title: 'Rule 12(6): Prohibited Misleading Words',
  description: 'Declaration of quantity must not contain words creating a misleading impression (e.g., "minimum", "about", "approximately").',
  weight: 5,
  evaluate: (extractedInfo) => {
    const words = extractedInfo.prohibitedWords;
    
    if (words && Array.isArray(words) && words.length > 0) {
      return {
        id: 'RULE-12-6',
        status: 'WARNING',
        severity: 'LOW',
        message: 'Prohibited qualifying words found near quantity.',
        detectedValue: words.join(', '),
        recommendation: 'Remove misleading words such as "minimum", "about", or "approximately".'
      };
    }

    return {
      id: 'RULE-12-6',
      status: 'PASS',
      message: 'No prohibited/misleading words found.',
      detectedValue: 'Clean'
    };
  }
};
