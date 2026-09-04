module.exports = {
  id: 'RULE-06-1-A',
  title: 'Rule 6(1)(a): Manufacturer/Packer Address',
  description: 'Name and complete address of the manufacturer, packer, or importer must be declared.',
  weight: 15,
  evaluate: (extractedInfo) => {
    const value = extractedInfo.manufacturer;
    const address = extractedInfo.address;
    
    if (!value || value === 'Not detected') {
      return {
        id: 'RULE-06-1-A',
        status: 'FAIL',
        severity: 'HIGH',
        message: 'Manufacturer or Packer name is missing.',
        detectedValue: 'Not detected',
        recommendation: 'Declare the full corporate name of the manufacturer or packer.'
      };
    }

    if (!address || address === 'Not detected') {
      return {
        id: 'RULE-06-1-A',
        status: 'FAIL',
        severity: 'HIGH',
        message: 'Complete address of the Manufacturer/Packer is missing.',
        detectedValue: value,
        recommendation: 'Add the complete physical address including PIN code.'
      };
    }

    return {
      id: 'RULE-06-1-A',
      status: 'PASS',
      message: 'Manufacturer name and address are declared.',
      detectedValue: `${value} - ${address}`
    };
  }
};
