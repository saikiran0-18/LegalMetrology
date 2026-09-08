const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { performOCR } = require('../services/ocrService');
const { extractInformation } = require('../services/extractionService');
const { evaluateCompliance } = require('../rules');
const { attachEvidenceToResults, calculateLegalStatus } = require('../services/evidenceService');
const { assessDeclarationReadability, reassessReadabilityWithCalibration, assessOverallImageQuality } = require('../services/readabilityService');
const sharp = require('sharp');
const Scan = require('../models/Scan');

const { requireAuth } = require('../middleware/auth');

// Configure Multer for product image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'product-' + uniqueSuffix + ext);
  }
});

// Configure Multer for supplementary evidence uploads
const evidenceStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '../uploads/evidence');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'supp-' + uniqueSuffix + ext);
  }
});

// Security: Validate file type and size
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const uploadEvidence = multer({
  storage: evidenceStorage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Middleware wrapper to catch Multer errors gracefully
const uploadSingle = (req, res, next) => {
  upload.single('productImage')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size limit exceeded. Maximum image size is 10MB.' });
      }
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};

// 1. Initiate Product Scan & Automated Evidence Extraction
router.post('/', requireAuth, uploadSingle, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const imagePath = req.file.path;

    // A. OCR Extraction
    let rawText = '';
    try {
      rawText = await performOCR(imagePath);
    } catch (ocrErr) {
      console.warn('Tesseract OCR warning (proceeding with fallback extraction):', ocrErr.message);
    }

    // B. Information Extraction
    const extractedInfo = await extractInformation(rawText, imagePath);

    const inspectionState = req.body.inspectionState || 'Central (All India)';
    const inspectionDate = req.body.inspectionDate ? new Date(req.body.inspectionDate) : new Date();

    // C. Compliance Evaluation (Dynamic jurisdiction & date versioning)
    const complianceResults = await evaluateCompliance(extractedInfo, {
      inspectionState,
      inspectionDate
    });

    // D. Generate Evidence & Bounding Boxes for Every Evaluated Rule
    const enrichedRuleResults = await attachEvidenceToResults(complianceResults.ruleResults, imagePath);
    const legalEnforcementStatus = calculateLegalStatus(enrichedRuleResults);

    // D2. Declaration Readability & Font-Size Assessment (Rule 9 / Schedule II)
    let readabilityAssessments = [];
    try {
      readabilityAssessments = await assessDeclarationReadability(imagePath, extractedInfo, null);
    } catch (readErr) {
      console.warn('Readability assessment error:', readErr.message);
    }

    // D3. Overall Image Clarity & Blur Quality Assessment
    let imageQuality = { isBlurry: false, blurScore: 85, clarityStatus: 'CRISP' };
    try {
      imageQuality = await assessOverallImageQuality(imagePath);
    } catch (qualityErr) {
      console.warn('Overall image quality assessment error:', qualityErr.message);
    }

    const finalRawText = extractedInfo.rawText || rawText;

    // E. Save to Database
    const newScan = new Scan({
      userId: req.user?._id !== 'demo_user' ? req.user?._id : undefined,
      inspectorName: req.user?.name || 'Inspector Officer',
      inspectionState: complianceResults.inspectionState || inspectionState,
      inspectionDate: complianceResults.inspectionDate || inspectionDate,
      productCategory: complianceResults.productCategory || extractedInfo.productCategory || 'General Packaged Commodity',
      imagePath: `/uploads/${req.file.filename}`,
      extractedText: finalRawText,
      extractedInfo: extractedInfo,
      ruleResults: enrichedRuleResults,
      score: complianceResults.score,
      riskLevel: complianceResults.riskLevel,
      legalEnforcementStatus,
      calibration: {
        isCalibrated: false,
        referenceType: 'NONE',
        referenceDimensionMm: null,
        pixelsPerMm: null
      },
      imageQuality,
      readabilityAssessments
    });

    await newScan.save();

    res.json({
      success: true,
      scanId: newScan._id,
      inspectionState,
      inspectionDate,
      ...complianceResults,
      ruleResults: enrichedRuleResults,
      legalEnforcementStatus,
      calibration: newScan.calibration,
      imageQuality,
      readabilityAssessments,
      extractedInfo
    });
  } catch (error) {
    console.error('Scan Error:', error);
    res.status(500).json({ error: 'An error occurred during scan processing' });
  }
});

// 2. Get Scan Details
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const scan = await Scan.findById(req.params.id);
    if (!scan) return res.status(404).json({ error: 'Scan not found' });
    res.json(scan);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch scan details' });
  }
});

// Helper to dynamically recalculate compliance score and risk level
const recalculateScanScore = (ruleResults) => {
  let totalWeight = 0;
  let deductions = 0;
  let highSeverityFails = 0;
  let mediumSeverityWarnings = 0;

  for (const result of ruleResults) {
    const weight = result.weight || (result.severity === 'HIGH' ? 25 : result.severity === 'MEDIUM' ? 15 : 10);
    totalWeight += weight;

    if (result.status === 'FAIL') {
      deductions += weight;
      if (result.severity === 'HIGH') {
        highSeverityFails++;
      }
    } else if (result.status === 'WARNING') {
      deductions += weight * 0.4;
      mediumSeverityWarnings++;
    }
  }

  const score = totalWeight > 0 ? Math.max(0, Math.round(((totalWeight - deductions) / totalWeight) * 100)) : 100;

  let riskLevel = 'LOW';
  if (highSeverityFails >= 2 || score < 60) {
    riskLevel = 'HIGH';
  } else if (highSeverityFails === 1 || mediumSeverityWarnings >= 2 || score < 85) {
    riskLevel = 'MEDIUM';
  }

  return { score, riskLevel };
};

// 3. Officer Adjudication: Accept, Reject, Edit Text, Change Category, Add Comments
router.put('/:id/evidence/:evidenceId', requireAuth, async (req, res) => {
  try {
    const { id, evidenceId } = req.params;
    const {
      officerVerificationStatus, // 'OFFICER_VERIFIED' | 'OFFICER_REJECTED' | 'AI_DETECTED'
      status,                    // 'PASS' | 'FAIL' | 'WARNING'
      officerComments,
      extractedText,
      violationCategory,
      highlightedRegion
    } = req.body;

    const scan = await Scan.findById(id);
    if (!scan) return res.status(404).json({ error: 'Scan record not found' });

    const item = scan.ruleResults.find(r => r.evidenceId === evidenceId || r.ruleId === evidenceId);
    if (!item) return res.status(404).json({ error: `Evidence item ${evidenceId} not found in scan` });

    if (officerVerificationStatus) {
      item.officerVerificationStatus = officerVerificationStatus;
      item.verifiedBy = req.user?.name || 'Inspector Officer';
      item.verifiedAt = new Date();
    }

    // Update rule status when officer adjudicates
    if (status) {
      item.status = status;
    } else if (officerVerificationStatus === 'OFFICER_VERIFIED' || officerVerificationStatus === 'OFFICER_REJECTED') {
      // When accepted by officer, set to PASS so tick turns green and score increases
      item.status = 'PASS';
    }

    if (typeof officerComments === 'string') {
      item.officerComments = officerComments;
    }

    if (typeof extractedText === 'string') {
      item.extractedText = extractedText;
      item.detectedValue = extractedText;
    }

    if (violationCategory) {
      item.violationCategory = violationCategory;
    }

    if (highlightedRegion && typeof highlightedRegion === 'object') {
      item.highlightedRegion = {
        x: Number(highlightedRegion.x) !== undefined ? Number(highlightedRegion.x) : item.highlightedRegion.x,
        y: Number(highlightedRegion.y) !== undefined ? Number(highlightedRegion.y) : item.highlightedRegion.y,
        width: Number(highlightedRegion.width) !== undefined ? Number(highlightedRegion.width) : item.highlightedRegion.width,
        height: Number(highlightedRegion.height) !== undefined ? Number(highlightedRegion.height) : item.highlightedRegion.height,
      };
    }

    // Dynamically recalculate score and risk level
    const { score, riskLevel } = recalculateScanScore(scan.ruleResults);
    scan.score = score;
    scan.riskLevel = riskLevel;

    scan.legalEnforcementStatus = calculateLegalStatus(scan.ruleResults);
    scan.officerReviewedAt = new Date();
    scan.officerReviewedBy = req.user?.name || 'Inspector Officer';

    await scan.save();

    res.json({
      success: true,
      message: `Violation evidence ${evidenceId} updated successfully. Status: ${item.status}, Score: ${scan.score}%.`,
      scan,
      updatedEvidence: item
    });
  } catch (err) {
    console.error('Evidence update error:', err);
    res.status(500).json({ error: 'Failed to update evidence: ' + err.message });
  }
});

// 4. Upload Supplementary Evidence (Photos, Seizure slips, Lab weight records)
router.post('/:id/evidence/:evidenceId/upload', requireAuth, uploadEvidence.single('evidenceFile'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No evidence file uploaded.' });

    const { id, evidenceId } = req.params;
    const notes = req.body.notes || '';

    const scan = await Scan.findById(id);
    if (!scan) return res.status(404).json({ error: 'Scan not found' });

    const item = scan.ruleResults.find(r => r.evidenceId === evidenceId || r.ruleId === evidenceId);
    if (!item) return res.status(404).json({ error: 'Evidence item not found' });

    const fileUrl = `/uploads/evidence/${req.file.filename}`;
    const newEvidence = {
      fileUrl,
      originalName: req.file.originalname,
      uploadedAt: new Date(),
      notes
    };

    item.additionalEvidence = item.additionalEvidence || [];
    item.additionalEvidence.push(newEvidence);

    await scan.save();

    res.json({
      success: true,
      message: 'Additional evidence attached successfully.',
      evidence: newEvidence,
      allAdditional: item.additionalEvidence
    });
  } catch (err) {
    console.error('Upload additional evidence error:', err);
    res.status(500).json({ error: 'Failed to upload additional evidence: ' + err.message });
  }
});

// 5. Image Calibration for Physical Font-Size & Readability Assessment (Rule 9)
router.post('/:id/calibrate', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      referenceType = 'PACKAGING_HEIGHT', // 'PACKAGING_HEIGHT' | 'PACKAGING_WIDTH' | 'KNOWN_MARKER' | 'CUSTOM_DIMENSION'
      referenceDimensionMm,
      packageHeightCm,
      packageWidthCm,
      customPixelsPerMm
    } = req.body;

    const scan = await Scan.findById(id);
    if (!scan) return res.status(404).json({ error: 'Scan record not found' });

    let absoluteImagePath = scan.imagePath;
    if (!path.isAbsolute(absoluteImagePath)) {
      absoluteImagePath = path.join(__dirname, '..', scan.imagePath);
    }

    let calculatedPxPerMm = null;
    let dimensionMm = Number(referenceDimensionMm);

    if (packageHeightCm && Number(packageHeightCm) > 0) {
      dimensionMm = Number(packageHeightCm) * 10; // convert cm to mm
    } else if (packageWidthCm && Number(packageWidthCm) > 0) {
      dimensionMm = Number(packageWidthCm) * 10;
    }

    if (customPixelsPerMm && Number(customPixelsPerMm) > 0) {
      calculatedPxPerMm = Number(customPixelsPerMm);
    } else if (dimensionMm && dimensionMm > 0) {
      if (fs.existsSync(absoluteImagePath)) {
        const meta = await sharp(absoluteImagePath).metadata();
        const baseDimensionPx = (referenceType === 'PACKAGING_WIDTH' || packageWidthCm) ? (meta.width || 800) : (meta.height || 1000);
        calculatedPxPerMm = Number((baseDimensionPx / dimensionMm).toFixed(4));
      } else {
        // Fallback assuming 1000px height
        calculatedPxPerMm = Number((1000 / dimensionMm).toFixed(4));
      }
    }

    if (!calculatedPxPerMm || calculatedPxPerMm <= 0) {
      return res.status(400).json({
        error: 'Invalid calibration input. Please provide a valid package height/width in cm/mm or custom px/mm.'
      });
    }

    // Re-evaluate readability assessments with calibrated scale
    const updatedAssessments = reassessReadabilityWithCalibration(scan.readabilityAssessments, calculatedPxPerMm);

    scan.calibration = {
      isCalibrated: true,
      referenceType,
      referenceDimensionMm: dimensionMm,
      pixelsPerMm: calculatedPxPerMm,
      calibratedAt: new Date(),
      calibratedBy: req.user?.name || 'Inspector Officer'
    };
    scan.readabilityAssessments = updatedAssessments;

    await scan.save();

    res.json({
      success: true,
      message: `Image calibrated successfully at ${calculatedPxPerMm} px/mm (${dimensionMm}mm reference). Font sizes re-evaluated under Rule 9.`,
      calibration: scan.calibration,
      readabilityAssessments: scan.readabilityAssessments
    });
  } catch (err) {
    console.error('Calibration error:', err);
    res.status(500).json({ error: 'Failed to calibrate scan image: ' + err.message });
  }
});

module.exports = router;
