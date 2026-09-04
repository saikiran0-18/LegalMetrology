module.exports = {
  id: 'RULE-06-1-D',
  title: 'Rule 6(1)(d): Month & Year of Manufacture',
  description: 'Month and year of manufacture, pre-packing, or import must be stated.',
  weight: 20,
  evaluate: (extractedInfo) => {
    const value = extractedInfo.manufacturingDate;
    
    if (!value || value === 'Not detected') {
      return {
        id: 'RULE-06-1-D',
        status: 'FAIL',
        severity: 'HIGH',
        message: 'Manufacturing, pre-packing, or import date is missing.',
        detectedValue: 'Not detected',
        recommendation: 'Declare the Month and Year of manufacture on the label.'
      };
    }

    return {
      id: 'RULE-06-1-D',
      status: 'PASS',
      message: 'Manufacturing date is declared.',
      detectedValue: value
    };
  }
};
