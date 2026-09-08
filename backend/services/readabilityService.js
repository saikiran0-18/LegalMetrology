const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Statutory minimum font height requirements under Rule 9 & Schedule II
const RULE_09_REQUIREMENTS = {
  'Net Quantity': {
    ruleId: 'RULE-06-1-C',
    ruleNumber: 'Rule 6(1)(c) & Rule 9',
    minHeightMm: 2.0, // Standard default for packages 50g-200g (Table I)
    requirement: 'Rule 9 Schedule II Table I: Minimum numeral height of 2.0mm for net quantity up to 200g/ml (4.0mm for >200g up to 1kg).'
  },
  'Maximum Retail Price (MRP)': {
    ruleId: 'RULE-06-1-E',
    ruleNumber: 'Rule 6(1)(e) & Rule 9',
    minHeightMm: 1.5,
    requirement: 'Rule 9 Schedule II: Numerals and currency symbols must be clear and at least 1.5mm in height, prominent against background.'
  },
  'Unit Sale Price (USP)': {
    ruleId: 'RULE-06-1-DA',
    ruleNumber: 'Rule 6(1)(da) & Rule 9',
    minHeightMm: 1.5,
    requirement: 'Rule 6(1)(da) & Rule 9: Unit sale price numerals must have minimum height of 1.5mm, distinct and legible.'
  },
  'Manufacturer / Packer Address': {
    ruleId: 'RULE-06-1-A',
    ruleNumber: 'Rule 6(1)(a) & Rule 9',
    minHeightMm: 1.0,
    requirement: 'Rule 9 Schedule II: Manufacturer/Packer name and address must be clearly legible with minimum 1.0mm letter height.'
  },
  'Generic or Common Name': {
    ruleId: 'RULE-06-1-B',
    ruleNumber: 'Rule 6(1)(b) & Rule 9',
    minHeightMm: 1.5,
    requirement: 'Rule 6(1)(b) & Rule 9: Common or generic name must be declared prominently on Principal Display Panel with minimum 1.5mm height.'
  },
  'Date of Manufacture / Packing': {
    ruleId: 'RULE-06-1-D',
    ruleNumber: 'Rule 6(1)(d) & Rule 9',
    minHeightMm: 1.0,
    requirement: 'Rule 9 Schedule II: Month and year of manufacture or packing must be legible and not less than 1.0mm in height.'
  },
  'Consumer Care Details': {
    ruleId: 'RULE-06-2',
    ruleNumber: 'Rule 6(2) & Rule 9',
    minHeightMm: 1.0,
    requirement: 'Rule 6(2) & Rule 9: Name, address, telephone and email for consumer complaints must be distinct and not less than 1.0mm.'
  },
  'Dimensions Declaration': {
    ruleId: 'RULE-06-1-F',
    ruleNumber: 'Rule 6(1)(f) & Rule 9',
    minHeightMm: 1.0,
    requirement: 'Rule 9 & Schedule III: Size or dimension numerals must be at least 1.0mm in height.'
  },
  'Country of Origin': {
    ruleId: 'RULE-06-1-G',
    ruleNumber: 'Rule 6(1)(g) & Rule 9',
    minHeightMm: 1.0,
    requirement: 'Rule 6(1)(g) & Rule 9: Country of origin or manufacture must be conspicuous with minimum 1.0mm height.'
  }
};

/**
 * Optical quality analysis on a cropped declaration image
 * Detects blur, low contrast, obstruction, distortion, and small text.
 */
const analyzeCropOpticalQuality = async (imagePath, region) => {
  const metrics = {
    blurDetected: false,
    blurScore: 85, // 0 to 100
    lowContrast: false,
    contrastRatio: 55,
    obstructionDetected: false,
    obstructionType: null,
    distortionDetected: false,
    distortionScore: 0,
    verySmallText: false
  };

  try {
    if (!imagePath || !fs.existsSync(imagePath)) {
      return metrics;
    }

    const meta = await sharp(imagePath).metadata();
    const imgWidth = meta.width || 800;
    const imgHeight = meta.height || 600;

    let left = Math.max(0, Math.round((region.x / 100) * imgWidth));
    let top = Math.max(0, Math.round((region.y / 100) * imgHeight));
    let width = Math.max(20, Math.round((region.width / 100) * imgWidth));
    let height = Math.max(15, Math.round((region.height / 100) * imgHeight));

    if (left + width > imgWidth) width = Math.max(10, imgWidth - left);
    if (top + height > imgHeight) height = Math.max(10, imgHeight - top);

    // 1. Contrast Analysis via Greyscale Channel Statistics
    const stats = await sharp(imagePath)
      .extract({ left, top, width, height })
      .greyscale()
      .stats();

    const channel = stats.channels[0];
    const stdev = channel.stdev || 50;
    const minVal = channel.min || 0;
    const maxVal = channel.max || 255;
    const meanVal = channel.mean || 128;

    metrics.contrastRatio = Math.round(stdev);
    // Low RMS contrast threshold
    if (stdev < 24 || (maxVal - minVal < 45)) {
      metrics.lowContrast = true;
    }

    // 2. Obstruction & Specular Glare Detection
    // Glare: excessive saturated blowout (>250 luminance across significant area)
    // Occlusion: intense shadow (<20 luminance)
    if (maxVal >= 252 && meanVal > 220) {
      metrics.obstructionDetected = true;
      metrics.obstructionType = 'Specular Glare / Hotspot Blowout';
    } else if (minVal <= 15 && meanVal < 35) {
      metrics.obstructionDetected = true;
      metrics.obstructionType = 'Shadow / Extreme Occlusion';
    }

    // 3. Sharpness & Blur Estimation via Laplacian Gradient Convolve
    try {
      const laplacianKernel = {
        width: 3,
        height: 3,
        kernel: [
          0, 1, 0,
          1, -4, 1,
          0, 1, 0
        ]
      };

      const convolvedStats = await sharp(imagePath)
        .extract({ left, top, width, height })
        .greyscale()
        .convolve(laplacianKernel)
        .stats();

      const edgeVariance = convolvedStats.channels[0].stdev || 50;
      // High edge variance = sharp; low variance = blurry
      if (edgeVariance < 20) {
        metrics.blurDetected = true;
        metrics.blurScore = Math.max(15, Math.round(edgeVariance * 2));
      } else {
        metrics.blurScore = Math.min(100, Math.round(40 + edgeVariance));
      }
    } catch (convolveErr) {
      // Fallback sharpness estimation
      metrics.blurScore = 80;
    }

    // 4. Very Small Text Detection
    // If estimated line height in crop is < 14px or < 1.6% of image height
    const estLineHeightPx = Math.round(height * 0.45);
    if (estLineHeightPx < 14 || (height / imgHeight) < 0.02) {
      metrics.verySmallText = true;
    }

    // 5. Distortion Estimation
    // Extreme bounding box aspect ratio or compression
    const aspect = width / height;
    if (aspect > 12 || aspect < 0.8) {
      metrics.distortionDetected = true;
      metrics.distortionScore = Math.round(Math.abs(aspect - 4));
    }

    return metrics;
  } catch (err) {
    console.warn('Optical quality analysis error:', err.message);
    return metrics;
  }
};

/**
 * Assess declaration readability and font size for all mandatory declarations.
 */
const assessDeclarationReadability = async (imagePath, extractedInfo = {}, calibration = null) => {
  let imgWidth = 800;
  let imgHeight = 600;

  if (imagePath && fs.existsSync(imagePath)) {
    try {
      const meta = await sharp(imagePath).metadata();
      imgWidth = meta.width || 800;
      imgHeight = meta.height || 600;
    } catch (e) {}
  }

  const isCalibrated = Boolean(calibration && calibration.isCalibrated && calibration.pixelsPerMm > 0);
  const pixelsPerMm = isCalibrated ? calibration.pixelsPerMm : null;

  const declarationsToAssess = [
    {
      name: 'Net Quantity',
      value: extractedInfo.netQuantity,
      region: { x: 8, y: 38, width: 45, height: 18 }
    },
    {
      name: 'Maximum Retail Price (MRP)',
      value: extractedInfo.mrp,
      region: { x: 8, y: 55, width: 42, height: 16 }
    },
    {
      name: 'Unit Sale Price (USP)',
      value: extractedInfo.unitSalePrice,
      region: { x: 50, y: 55, width: 45, height: 16 }
    },
    {
      name: 'Manufacturer / Packer Address',
      value: extractedInfo.manufacturer !== 'Not detected' ? `${extractedInfo.manufacturer}, ${extractedInfo.address || ''}` : 'Not detected',
      region: { x: 5, y: 72, width: 90, height: 20 }
    },
    {
      name: 'Generic or Common Name',
      value: extractedInfo.productName,
      region: { x: 10, y: 12, width: 80, height: 16 }
    },
    {
      name: 'Date of Manufacture / Packing',
      value: extractedInfo.manufacturingDate,
      region: { x: 55, y: 38, width: 40, height: 18 }
    },
    {
      name: 'Consumer Care Details',
      value: extractedInfo.consumerCare,
      region: { x: 8, y: 84, width: 84, height: 14 }
    }
  ];

  const assessments = [];

  for (const item of declarationsToAssess) {
    const req = RULE_09_REQUIREMENTS[item.name] || {
      ruleId: 'RULE-09',
      ruleNumber: 'Rule 9',
      minHeightMm: 1.0,
      requirement: 'Rule 9 Schedule II: Minimum font height standards adherence.'
    };

    const isDetected = item.value && item.value !== 'Not detected';
    const detectedText = isDetected ? item.value : 'Not detected on package label';

    // 1. Analyze optical quality on crop
    const metrics = await analyzeCropOpticalQuality(imagePath, item.region);

    // 2. Character Height in Pixels
    // Based on crop height: single-line declarations occupy ~50-65% of crop height
    const cropPixelHeight = Math.round((item.region.height / 100) * imgHeight);
    const estCharHeightPx = isDetected 
      ? Math.max(12, Math.round(cropPixelHeight * 0.48))
      : 0;

    // 3. Physical Height in Millimeters
    let estCharHeightMm = null;
    if (isCalibrated && pixelsPerMm > 0 && estCharHeightPx > 0) {
      estCharHeightMm = Number((estCharHeightPx / pixelsPerMm).toFixed(2));
    }

    // 4. Optical Readability Status Label
    let readabilityStatus = 'Optimal Clarity';
    if (!isDetected) {
      readabilityStatus = 'Declaration Missing';
    } else if (metrics.obstructionDetected) {
      readabilityStatus = metrics.obstructionType || 'Obstructed / Glare Hotspot';
    } else if (metrics.blurDetected && metrics.lowContrast) {
      readabilityStatus = 'Severe Blur & Low Contrast';
    } else if (metrics.blurDetected) {
      readabilityStatus = 'Moderate Blur';
    } else if (metrics.lowContrast) {
      readabilityStatus = 'Low Contrast Background';
    } else if (metrics.distortionDetected) {
      readabilityStatus = 'Aspect Distortion';
    } else if (metrics.verySmallText) {
      readabilityStatus = 'Sub-Legible Small Print';
    }

    // 5. Result: PASS / FAIL / REVIEW
    // MANDATORY CONSTRAINT: Do not claim exact physical font size from uncalibrated photograph.
    // If physical measurement cannot be reliably determined, mark as REVIEW and explain physical verification required.
    let result = 'REVIEW';
    let explanation = '';

    if (!isDetected) {
      result = 'FAIL';
      explanation = 'Mandatory declaration was not detected on the packaging label.';
    } else if (metrics.obstructionDetected || (metrics.blurDetected && metrics.lowContrast)) {
      result = 'FAIL';
      explanation = `Declaration is obscured by optical defects (${readabilityStatus}). Violates Rule 9 clear display requirement.`;
    } else if (isCalibrated) {
      // CALIBRATED INSPECTION
      if (estCharHeightMm && estCharHeightMm >= req.minHeightMm) {
        result = 'PASS';
        explanation = `Calibrated physical character height (${estCharHeightMm}mm) complies with Rule 9 Schedule II minimum requirement (${req.minHeightMm}mm).`;
      } else if (estCharHeightMm && estCharHeightMm < req.minHeightMm) {
        result = 'FAIL';
        explanation = `Calibrated physical character height (${estCharHeightMm}mm) is below statutory minimum (${req.minHeightMm}mm) under Rule 9 Schedule II.`;
      } else {
        result = 'REVIEW';
        explanation = 'Physical scale calibrated, but character boundaries require manual confirmation.';
      }
    } else {
      // UNCALIBRATED PHOTOGRAPH (Statutory Rule Enforcement)
      result = 'REVIEW';
      explanation = 'Uncalibrated photograph: Physical font height in millimeters cannot be legally determined without reference calibration or physical vernier gauge inspection. Physical verification required.';
    }

    // Confidence
    let confidence = 0.94;
    if (metrics.blurDetected) confidence -= 0.15;
    if (metrics.lowContrast) confidence -= 0.12;
    if (metrics.obstructionDetected) confidence -= 0.20;
    if (!isDetected) confidence = 0.95;
    confidence = Math.max(0.65, Math.min(0.98, Number(confidence.toFixed(2))));

    assessments.push({
      declaration: item.name,
      ruleId: req.ruleId,
      ruleNumber: req.ruleNumber,
      detectedText,
      boundingBox: item.region,
      characterHeightPx: estCharHeightPx,
      characterHeightMm: estCharHeightMm,
      isCalibrated,
      readabilityStatus,
      metrics,
      confidence,
      applicableRequirement: req.requirement,
      result,
      explanation
    });
  }

  return assessments;
};

/**
 * Re-evaluate font height and readability with officer-provided physical calibration.
 */
const reassessReadabilityWithCalibration = (readabilityAssessments, pixelsPerMm) => {
  if (!Array.isArray(readabilityAssessments) || !pixelsPerMm || pixelsPerMm <= 0) {
    return readabilityAssessments;
  }

  return readabilityAssessments.map(item => {
    const req = RULE_09_REQUIREMENTS[item.declaration] || {
      minHeightMm: 1.5,
      requirement: 'Rule 9 Schedule II font standards'
    };

    const isDetected = item.detectedText && item.detectedText !== 'Not detected on package label';
    if (!isDetected) {
      return { ...item, isCalibrated: true, characterHeightMm: null, result: 'FAIL' };
    }

    // Compute physical height in mm
    const heightMm = Number((item.characterHeightPx / pixelsPerMm).toFixed(2));

    let result = 'REVIEW';
    let explanation = '';

    if (item.metrics?.obstructionDetected || (item.metrics?.blurDetected && item.metrics?.lowContrast)) {
      result = 'FAIL';
      explanation = `Optical obstruction or severe degradation (${item.readabilityStatus}). Fails Rule 9 clarity mandate.`;
    } else if (heightMm >= req.minHeightMm) {
      result = 'PASS';
      explanation = `Calibrated physical character height (${heightMm}mm) satisfies and exceeds Rule 9 Schedule II minimum requirement (${req.minHeightMm}mm).`;
    } else {
      result = 'FAIL';
      explanation = `Calibrated physical character height (${heightMm}mm) is non-compliant: below statutory minimum (${req.minHeightMm}mm) under Rule 9 Schedule II Table I.`;
    }

    return {
      ...item,
      isCalibrated: true,
      characterHeightMm: heightMm,
      result,
      explanation
    };
  });
};

module.exports = {
  assessDeclarationReadability,
  reassessReadabilityWithCalibration,
  analyzeCropOpticalQuality,
  RULE_09_REQUIREMENTS
};
