module.exports = {
  id: 'RULE-08',
  title: 'Rule 8: Declarations on Principal Display Panel (PDP)',
  description: 'All statutory declarations on a package shall appear grouped together on the Principal Display Panel (PDP) and must be legible, definite, and prominent.',
  weight: 10,
  evaluate: (extractedInfo) => {
    // Check if key declarations are present and clearly readable
    const hasName = extractedInfo.productName && extractedInfo.productName !== 'Not detected';
    const hasQty = extractedInfo.netQuantity && extractedInfo.netQuantity !== 'Not detected';
    const hasMrp = extractedInfo.mrp && extractedInfo.mrp !== 'Not detected';

    if (!hasName || !hasQty || !hasMrp) {
      return {
        id: 'RULE-08',
        status: 'WARNING',
        severity: 'MEDIUM',
        message: 'Key statutory declarations are fragmented or partially missing from the Principal Display Panel.',
        detectedValue: 'Partially grouped',
        recommendation: 'Ensure Name, Net Quantity, and MRP are grouped together in a distinct, unobstructed visual area on the principal display panel.'
      };
    }

    return {
      id: 'RULE-08',
      status: 'PASS',
      message: 'Statutory declarations are clearly presented and grouped on the display panel.',
      detectedValue: 'Prominent & Grouped'
    };
  }
};
