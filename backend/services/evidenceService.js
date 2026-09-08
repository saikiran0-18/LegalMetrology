const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Statutory mappings for Legal Metrology declaration types and violation categories
const STATUTORY_METADATA = {
  'RULE-06-1-A': {
    declarationType: 'Manufacturer / Packer Address',
    violationCategory: 'Missing or Incomplete Manufacturer / Packer Address',
    defaultRegion: { x: 5, y: 72, width: 90, height: 20 },
    confidence: 0.94
  },
  'RULE-06-1-B': {
    declarationType: 'Generic or Common Name',
    violationCategory: 'Missing Generic / Common Commodity Name',
    defaultRegion: { x: 10, y: 12, width: 80, height: 16 },
    confidence: 0.96
  },
  'RULE-06-1-C': {
    declarationType: 'Net Quantity',
    violationCategory: 'Net Quantity Declaration Non-Compliance',
    defaultRegion: { x: 8, y: 38, width: 45, height: 18 },
    confidence: 0.95
  },
  'RULE-06-1-D': {
    declarationType: 'Date of Manufacture / Packing',
    violationCategory: 'Missing or Non-Compliant Date Declaration',
    defaultRegion: { x: 55, y: 38, width: 40, height: 18 },
    confidence: 0.92
  },
  'RULE-06-1-DA': {
    declarationType: 'Unit Sale Price (USP)',
    violationCategory: 'Unit Sale Price Non-Compliance / Omission',
    defaultRegion: { x: 50, y: 55, width: 45, height: 16 },
    confidence: 0.93
  },
  'RULE-06-1-E': {
    declarationType: 'Maximum Retail Price (MRP)',
    violationCategory: 'Improper MRP Declaration / Deceptive Pricing',
    defaultRegion: { x: 8, y: 55, width: 42, height: 16 },
    confidence: 0.95
  },
  'RULE-06-1-F': {
    declarationType: 'Dimensions Declaration',
    violationCategory: 'Missing or Non-Standard Commodity Dimensions',
    defaultRegion: { x: 15, y: 30, width: 70, height: 15 },
    confidence: 0.90
  },
  'RULE-06-1-G': {
    declarationType: 'Country of Origin',
    violationCategory: 'Country of Origin Omission',
    defaultRegion: { x: 55, y: 70, width: 40, height: 15 },
    confidence: 0.93
  },
  'RULE-06-2': {
    declarationType: 'Consumer Care Details',
    violationCategory: 'Consumer Grievance Redressal Omission',
    defaultRegion: { x: 8, y: 84, width: 84, height: 14 },
    confidence: 0.91
  },
  'RULE-08': {
    declarationType: 'Principal Display Panel (PDP)',
    violationCategory: 'PDP Area Grouping Non-Compliance',
    defaultRegion: { x: 5, y: 8, width: 90, height: 84 },
    confidence: 0.89
  },
  'RULE-09': {
    declarationType: 'Minimum Font Height (Schedule II)',
    violationCategory: 'Font Height Non-Compliance under Rule 9',
    defaultRegion: { x: 8, y: 40, width: 84, height: 25 },
    confidence: 0.88
  },
  'RULE-10': {
    declarationType: 'E-Commerce Marketplace Declarations',
    violationCategory: 'Digital Listing Mandatory Declaration Defect',
    defaultRegion: { x: 10, y: 15, width: 80, height: 70 },
    confidence: 0.91
  },
  'RULE-12-6': {
    declarationType: 'Prohibited Misleading Words',
    violationCategory: 'Deceptive Packaging / Prohibited Terms',
    defaultRegion: { x: 15, y: 35, width: 70, height: 20 },
    confidence: 0.94
  },
  'RULE-13': {
    declarationType: 'Standard Metric Units',
    violationCategory: 'Non-Metric or Illegal Symbol Used',
    defaultRegion: { x: 20, y: 45, width: 60, height: 15 },
    confidence: 0.95
  },
  // State enforcement defaults
  'TS-ENF-07': {
    declarationType: 'State Packer Registration (Rule 7)',
    violationCategory: 'Telangana Legal Metrology Registration Omission',
    defaultRegion: { x: 10, y: 75, width: 80, height: 18 },
    confidence: 0.92
  },
  'TS-ENF-04': {
    declarationType: 'Equipment Verification & Stamping',
    violationCategory: 'Telangana Stamping Verification Non-Compliance',
    defaultRegion: { x: 15, y: 45, width: 70, height: 20 },
    confidence: 0.90
  },
  'TS-ENF-14': {
    declarationType: 'State Consumer Redressal Cell',
    violationCategory: 'Telangana Consumer Redressal Details Omission',
    defaultRegion: { x: 10, y: 82, width: 80, height: 16 },
    confidence: 0.90
  }
};

/**
 * Generate cropped evidence image from original image using sharp
 */
const generateEvidenceCrop = async (imagePath, region, evidenceId) => {
  try {
    if (!imagePath || !fs.existsSync(imagePath)) {
      return null;
    }

    const metadata = await sharp(imagePath).metadata();
    const imgWidth = metadata.width || 800;
    const imgHeight = metadata.height || 600;

    // Convert percentage coordinates to integer pixel coordinates
    let left = Math.max(0, Math.round((region.x / 100) * imgWidth));
    let top = Math.max(0, Math.round((region.y / 100) * imgHeight));
    let width = Math.max(20, Math.round((region.width / 100) * imgWidth));
    let height = Math.max(20, Math.round((region.height / 100) * imgHeight));

    // Clamp coordinates to image boundaries
    if (left + width > imgWidth) {
      width = Math.max(10, imgWidth - left);
    }
    if (top + height > imgHeight) {
      height = Math.max(10, imgHeight - top);
    }

    const evidenceDir = path.join(__dirname, '..', 'uploads', 'evidence');
    if (!fs.existsSync(evidenceDir)) {
      fs.mkdirSync(evidenceDir, { recursive: true });
    }

    const cropFilename = `evidence-${evidenceId.toLowerCase()}.jpg`;
    const cropFullPath = path.join(evidenceDir, cropFilename);

    await sharp(imagePath)
      .extract({ left, top, width, height })
      .jpeg({ quality: 90 })
      .toFile(cropFullPath);

    return `/uploads/evidence/${cropFilename}`;
  } catch (err) {
    console.warn(`Could not generate cropped evidence for ${evidenceId}:`, err.message);
    return null;
  }
};

/**
 * Attach evidence management items to every evaluated rule result
 */
const attachEvidenceToResults = async (ruleResults, originalImagePath) => {
  if (!Array.isArray(ruleResults)) return [];

  const evidenceDir = path.join(__dirname, '..', 'uploads', 'evidence');
  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }

  const prefix = Date.now().toString(36).toUpperCase();

  const enriched = await Promise.all(
    ruleResults.map(async (r, i) => {
      const ruleMeta = STATUTORY_METADATA[r.ruleId] || {
        declarationType: r.ruleName || 'Statutory Declaration',
        violationCategory: 'Legal Metrology Requirement Non-Compliance',
        defaultRegion: { x: 10 + (i * 5) % 40, y: 15 + (i * 8) % 65, width: 75, height: 18 },
        confidence: 0.90
      };

      const evidenceId = `EV-${prefix}-${(i + 1).toString().padStart(2, '0')}`;
      const highlightedRegion = ruleMeta.defaultRegion;

      // Generate cropped evidence image
      let croppedEvidenceUrl = null;
      if (originalImagePath) {
        croppedEvidenceUrl = await generateEvidenceCrop(originalImagePath, highlightedRegion, evidenceId);
      }

      // Determine normalized original relative image path
      let relOrigPath = null;
      if (originalImagePath) {
        const norm = originalImagePath.replace(/\\/g, '/');
        const parts = norm.split('uploads/');
        relOrigPath = parts.length > 1 ? `/uploads/${parts[1]}` : norm;
      }

      return {
        ...r,
        evidenceId,
        declarationType: ruleMeta.declarationType,
        violationCategory: ruleMeta.violationCategory,
        highlightedRegion,
        croppedEvidenceUrl,
        originalImagePath: relOrigPath,
        extractedText: (r.detectedValue && r.detectedValue !== 'Not detected') ? r.detectedValue : '',
        aiConfidence: ruleMeta.confidence,
        // Default: AI Detected. NEVER automatically becomes final legal violation without officer sign-off!
        officerVerificationStatus: 'AI_DETECTED',
        officerComments: '',
        verifiedBy: null,
        verifiedAt: null,
        additionalEvidence: [],
        createdAt: new Date()
      };
    })
  );

  return enriched;
};

/**
 * Recalculate legal enforcement status based on officer verifications
 */
const calculateLegalStatus = (ruleResults) => {
  if (!Array.isArray(ruleResults) || ruleResults.length === 0) {
    return 'COMPLIANT';
  }

  const nonPassRules = ruleResults.filter(r => r.status === 'FAIL' || r.status === 'WARNING');
  if (nonPassRules.length === 0) {
    return 'COMPLIANT';
  }

  const verifiedViolations = nonPassRules.filter(r => r.officerVerificationStatus === 'OFFICER_VERIFIED');
  if (verifiedViolations.length > 0) {
    return 'LEGAL_VIOLATIONS_CONFIRMED';
  }

  const allRejected = nonPassRules.every(r => r.officerVerificationStatus === 'OFFICER_REJECTED');
  if (allRejected) {
    return 'ALL_VIOLATIONS_DISMISSED';
  }

  return 'PENDING_OFFICER_REVIEW';
};

module.exports = {
  attachEvidenceToResults,
  generateEvidenceCrop,
  calculateLegalStatus,
  STATUTORY_METADATA
};
