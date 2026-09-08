const assert = require('assert');
const path = require('path');
const fs = require('fs');
const {
  assessDeclarationReadability,
  reassessReadabilityWithCalibration,
  RULE_09_REQUIREMENTS
} = require('../services/readabilityService');

async function runTests() {
  console.log('--- Starting Readability & Font-Size Assessment Test Suite ---');

  const sampleExtractedInfo = {
    productName: 'Premium Roasted Cashew Nuts',
    netQuantity: '500 g',
    mrp: 'Rs. 199.00',
    unitSalePrice: 'Rs. 0.40 per g',
    manufacturer: 'Packsure FMCG Pvt Ltd',
    manufacturingDate: '01/2026',
    consumerCare: 'care@packsure.in / 1800-111-222',
    address: 'Plot 42, Industrial Area, Sector 5, Bangalore, Karnataka 560001',
    countryOfOrigin: 'India',
    dimensions: '15cm x 10cm x 5cm'
  };

  // Test 1: Uncalibrated Photograph Assessment
  console.log('\n[Test 1] Assessing uncalibrated photograph...');
  const uncalibratedResults = await assessDeclarationReadability(null, sampleExtractedInfo, null);

  assert(Array.isArray(uncalibratedResults), 'Should return an array of assessments');
  assert(uncalibratedResults.length >= 7, 'Should assess all mandatory declarations');

  for (const item of uncalibratedResults) {
    // Check required fields
    assert(item.declaration, 'Declaration name required');
    assert(item.ruleId, 'Rule ID required');
    assert(item.ruleNumber, 'Rule Number required');
    assert(item.boundingBox, 'Bounding Box required');
    assert(typeof item.characterHeightPx === 'number', 'Character height in px required');
    assert(item.readabilityStatus, 'Readability status required');
    assert(item.confidence >= 0.5 && item.confidence <= 1.0, 'Confidence must be between 0.5 and 1.0');
    assert(item.applicableRequirement, 'Applicable requirement text required');
    assert(['PASS', 'FAIL', 'REVIEW'].includes(item.result), 'Result must be PASS, FAIL, or REVIEW');

    // Statutory Mandate Check: Uncalibrated photographs MUST return REVIEW
    assert.strictEqual(
      item.result,
      'REVIEW',
      `Uncalibrated photo must yield REVIEW for ${item.declaration}`
    );
    assert(
      item.explanation.includes('Uncalibrated photograph') && item.explanation.includes('Physical verification required'),
      `Explanation must explain why physical verification is required for ${item.declaration}`
    );
  }
  console.log('✓ Test 1 Passed: All uncalibrated declarations correctly marked as REVIEW with statutory explanation.');

  // Test 2: Calibrated Scale Re-evaluation (e.g. 10 px/mm)
  console.log('\n[Test 2] Calibrating scale with 10 px/mm...');
  const pixelsPerMm = 10.0;
  const calibratedResults = reassessReadabilityWithCalibration(uncalibratedResults, pixelsPerMm);

  assert.strictEqual(calibratedResults.length, uncalibratedResults.length);

  for (const item of calibratedResults) {
    assert.strictEqual(item.isCalibrated, true, 'Item should be marked calibrated');
    assert(typeof item.characterHeightMm === 'number', 'Character height in mm must be numeric');

    const expectedMm = Number((item.characterHeightPx / pixelsPerMm).toFixed(2));
    assert.strictEqual(item.characterHeightMm, expectedMm, 'Character height in mm calculation mismatch');

    const ruleReq = RULE_09_REQUIREMENTS[item.declaration];
    if (ruleReq) {
      if (item.characterHeightMm >= ruleReq.minHeightMm) {
        assert.strictEqual(item.result, 'PASS', `${item.declaration} should PASS since ${item.characterHeightMm}mm >= ${ruleReq.minHeightMm}mm`);
      } else {
        assert.strictEqual(item.result, 'FAIL', `${item.declaration} should FAIL since ${item.characterHeightMm}mm < ${ruleReq.minHeightMm}mm`);
      }
    }
  }
  console.log('✓ Test 2 Passed: Calibrated dimensions correctly convert px to mm and evaluate PASS/FAIL against Rule 9.');

  // Test 3: Sub-minimum font height failure
  console.log('\n[Test 3] Testing sub-minimum font height failure (high px/mm density)...');
  const highDensityPxPerMm = 100.0; // Ensures all estimated heights < statutory minimums (1.0mm - 2.0mm)
  const failedResults = reassessReadabilityWithCalibration(uncalibratedResults, highDensityPxPerMm);
  const allFailed = failedResults.every(r => r.result === 'FAIL');
  assert(allFailed, 'Sub-minimum font heights must FAIL under Rule 9');
  console.log('✓ Test 3 Passed: Sub-minimum font heights correctly FAIL statutory compliance.');

  console.log('\nAll Readability & Font-Size Assessment tests PASSED successfully!');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
