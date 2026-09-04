module.exports = {
  id: 'RULE-06-2',
  title: 'Rule 6(2): Consumer Complaint Contact',
  description: 'Name, address, telephone, and email (if available) of person/office for consumer complaints must be declared.',
  weight: 15,
  evaluate: (extractedInfo) => {
    const value = extractedInfo.consumerCare;
    
    if (!value || value === 'Not detected') {
      return {
        id: 'RULE-06-2',
        status: 'FAIL',
        severity: 'MEDIUM',
        message: 'Consumer care contact details are missing.',
        detectedValue: 'Not detected',
        recommendation: 'Add the customer care email, phone number, and address.'
      };
    }

    const hasPhone = /\d{10}/.test(value) || /1800/.test(value) || /0\d{3,4}[-\s]?\d{6,8}/.test(value);
    const hasEmail = /@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(value);

    if (!hasPhone && !hasEmail) {
      return {
        id: 'RULE-06-2',
        status: 'WARNING',
        severity: 'LOW',
        message: 'Consumer care details may be incomplete.',
        detectedValue: value,
        recommendation: 'Ensure both a phone number and email address are provided.'
      };
    }

    return {
      id: 'RULE-06-2',
      status: 'PASS',
      message: 'Consumer care details are declared.',
      detectedValue: value
    };
  }
};
