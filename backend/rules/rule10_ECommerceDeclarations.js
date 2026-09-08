module.exports = {
  id: 'RULE-10',
  title: 'Rule 10: E-Commerce Mandatory Declarations',
  description: 'An e-commerce entity shall ensure that the mandatory declarations specified in Rule 6(1) are displayed on the digital marketplace prior to purchase.',
  weight: 5,
  evaluate: (extractedInfo) => {
    // Check if the package bears digital/QR codes or standard marketplace declarations
    const hasDeclarations = 
      extractedInfo.productName !== 'Not detected' &&
      extractedInfo.mrp !== 'Not detected' &&
      extractedInfo.netQuantity !== 'Not detected';

    if (!hasDeclarations) {
      return {
        id: 'RULE-10',
        status: 'WARNING',
        severity: 'LOW',
        message: 'Missing primary attributes required for e-commerce catalog display under Rule 10.',
        detectedValue: 'Incomplete e-commerce attributes',
        recommendation: 'Ensure all mandatory retail declarations are mirrored accurately on any e-commerce digital listings.'
      };
    }

    return {
      id: 'RULE-10',
      status: 'PASS',
      message: 'All core attributes required for digital marketplace compliance are present.',
      detectedValue: 'Digital Ready'
    };
  }
};
