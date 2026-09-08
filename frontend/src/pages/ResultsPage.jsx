import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ArrowLeft, 
  Download, 
  FileText, 
  Scan, 
  BookOpen, 
  MapPin, 
  Landmark, 
  ExternalLink,
  ShieldCheck,
  Filter,
  GitBranch,
  Check,
  X,
  Edit3,
  Upload,
  Paperclip,
  Eye,
  EyeOff,
  UserCheck,
  Scale,
  Layers,
  AlertOctagon,
  Save,
  Image as ImageIcon,
  Ruler,
  HelpCircle,
  Maximize2,
  Sliders,
  Sparkles,
  CheckSquare,
  Info,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Search,
  Key
} from 'lucide-react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { cn, API_URL, getImageUrl } from '../lib/utils';

export default function ResultsPage() {
  const { id } = useParams();
  const [scan, setScan] = useState(null);
  const [activeRule, setActiveRule] = useState(null);
  const [selectedJurisdiction, setSelectedJurisdiction] = useState('ALL'); // 'ALL' | 'Central' | 'State'
  const [loading, setLoading] = useState(true);

  // Main Tab Navigation: 'statutory' (Legal Rules & Adjudication) vs 'readability' (Rule 9 Font Size & Readability)
  const [activeMainTab, setActiveMainTab] = useState('statutory');
  const [selectedReadabilityItem, setSelectedReadabilityItem] = useState(null);

  // Evidence Management UI State
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const [isEditingText, setIsEditingText] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [officerComments, setOfficerComments] = useState('');
  const [isSavingAdjudication, setIsSavingAdjudication] = useState(false);
  const [adjudicationMessage, setAdjudicationMessage] = useState(null);

  // Image Zoom Lightbox Modal State
  const [zoomModal, setZoomModal] = useState({
    isOpen: false,
    imageUrl: '',
    title: '',
    scale: 1,
    rotation: 0
  });

  const handleOpenZoom = (imageUrl, title = 'Product Packaging Inspection') => {
    if (!imageUrl) return;
    setZoomModal({
      isOpen: true,
      imageUrl,
      title,
      scale: 1,
      rotation: 0
    });
  };

  const handleCloseZoom = () => {
    setZoomModal(prev => ({ ...prev, isOpen: false }));
  };

  const handleZoomIn = () => {
    setZoomModal(prev => ({ ...prev, scale: Math.min(prev.scale + 0.25, 4) }));
  };

  const handleZoomOut = () => {
    setZoomModal(prev => ({ ...prev, scale: Math.max(prev.scale - 0.25, 0.5) }));
  };

  const handleResetZoom = () => {
    setZoomModal(prev => ({ ...prev, scale: 1, rotation: 0 }));
  };

  const handleRotate = () => {
    setZoomModal(prev => ({ ...prev, rotation: (prev.rotation + 90) % 360 }));
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && zoomModal.isOpen) {
        handleCloseZoom();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomModal.isOpen]);

  // Additional Evidence Upload State
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadNotes, setUploadNotes] = useState('');
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);
  const fileInputRef = useRef(null);

  // Image Dimension Calibration State (Rule 9)
  const [isCalibrateOpen, setIsCalibrateOpen] = useState(false);
  const [calibReferenceType, setCalibReferenceType] = useState('PACKAGING_HEIGHT');
  const [calibDimensionValue, setCalibDimensionValue] = useState('20');
  const [calibUnit, setCalibUnit] = useState('cm'); // 'cm' | 'mm'
  const [customPxPerMm, setCustomPxPerMm] = useState('');
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationError, setCalibrationError] = useState(null);
  const [calibrationSuccess, setCalibrationSuccess] = useState(null);

  // Gemini AI Extraction & Configuration State
  const [isExtractingGemini, setIsExtractingGemini] = useState(false);
  const [isGeminiModalOpen, setIsGeminiModalOpen] = useState(false);
  const [geminiApiKeyInput, setGeminiApiKeyInput] = useState(localStorage.getItem('gemini_api_key') || '');
  const [geminiStatus, setGeminiStatus] = useState({ hasKey: false, keyPreview: '' });
  const [geminiMessage, setGeminiMessage] = useState(null);
  const [showApiKey, setShowApiKey] = useState(false);

  const fetchGeminiConfig = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/scan/gemini-config`);
      if (res.data) {
        setGeminiStatus(res.data);
      }
    } catch (e) {
      console.warn('Could not check Gemini config:', e.message);
    }
  };

  useEffect(() => {
    fetchGeminiConfig();
  }, []);

  const handleSaveGeminiKey = async (e) => {
    if (e) e.preventDefault();
    if (!geminiApiKeyInput || geminiApiKeyInput.trim().length < 10) {
      setGeminiMessage({ type: 'error', text: 'Please enter a valid Gemini API Key.' });
      return;
    }

    try {
      const trimmed = geminiApiKeyInput.trim();
      const res = await axios.post(`${API_URL}/api/scan/gemini-config`, { apiKey: trimmed });
      if (res.data?.success) {
        localStorage.setItem('gemini_api_key', trimmed);
        setGeminiStatus({ hasKey: true, keyPreview: res.data.keyPreview });
        setGeminiMessage({ type: 'success', text: 'Gemini API Key activated! Extracting declarations...' });
        setIsGeminiModalOpen(false);
        handleExtractWithGemini(trimmed);
      }
    } catch (err) {
      setGeminiMessage({ type: 'error', text: err.response?.data?.error || 'Failed to save Gemini key.' });
    }
  };

  const handleExtractWithGemini = async (overrideKey = null) => {
    const keyToUse = overrideKey || localStorage.getItem('gemini_api_key') || '';
    if (!geminiStatus.hasKey && (!keyToUse || keyToUse.length < 10)) {
      setIsGeminiModalOpen(true);
      return;
    }

    setIsExtractingGemini(true);
    setGeminiMessage(null);

    try {
      const payload = keyToUse ? { apiKey: keyToUse } : {};
      const res = await axios.post(`${API_URL}/api/scan/${scan._id}/re-extract`, payload);
      if (res.data?.success) {
        setScan(res.data.scan);
        setActiveRule(prev => {
          if (!prev) return res.data.scan.ruleResults[0];
          const found = res.data.scan.ruleResults.find(r => r.ruleId === prev.ruleId);
          return found || res.data.scan.ruleResults[0];
        });
        setGeminiMessage({
          type: 'success',
          text: 'Declarations successfully extracted with Gemini AI! All mandatory packaging fields placed correctly.'
        });
      }
    } catch (err) {
      console.error('Failed to extract with Gemini', err);
      const errMsg = err.response?.data?.error || 'Gemini extraction failed. Please check your API Key and image.';
      setGeminiMessage({ type: 'error', text: errMsg });
      if (errMsg.toLowerCase().includes('key') || errMsg.toLowerCase().includes('api')) {
        setIsGeminiModalOpen(true);
      }
    } finally {
      setIsExtractingGemini(false);
    }
  };

  const fetchScan = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/history/${id}`);
      setScan(res.data);
      if (res.data.ruleResults && res.data.ruleResults.length > 0) {
        // Keep currently selected rule if already active, else select first
        setActiveRule(prev => {
          if (!prev) return res.data.ruleResults[0];
          const found = res.data.ruleResults.find(r => r.ruleId === prev.ruleId);
          return found || res.data.ruleResults[0];
        });
      }
    } catch (error) {
      console.error("Failed to load scan", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScan();
  }, [id]);

  // Sync form inputs when activeRule changes
  useEffect(() => {
    if (activeRule) {
      setEditedText(activeRule.extractedText || activeRule.detectedValue || '');
      setSelectedCategory(activeRule.violationCategory || 'Missing Mandatory Declaration');
      setOfficerComments(activeRule.officerComments || '');
      setIsEditingText(false);
      setAdjudicationMessage(null);
    }
  }, [activeRule?.ruleId, activeRule?.officerVerificationStatus]);

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground font-medium text-lg">Loading compliance results...</div>;
  }

  if (!scan) {
    return (
      <div className="p-8 text-center text-foreground font-medium">
        <h2 className="text-xl font-bold mb-4">Scan not found</h2>
        <Link to="/" className="text-primary hover:underline font-semibold">Return to Dashboard</Link>
      </div>
    );
  }

  // Calculate statistics
  const failures = scan.ruleResults.filter(r => r.status === 'FAIL').length;
  const warnings = scan.ruleResults.filter(r => r.status === 'WARNING').length;
  const passed = scan.ruleResults.filter(r => r.status === 'PASS').length;

  const centralCount = scan.ruleResults.filter(r => r.jurisdiction === 'Central').length;
  const stateCount = scan.ruleResults.filter(r => r.jurisdiction === 'State').length;

  const verifiedViolationsCount = scan.ruleResults.filter(
    r => (r.status === 'FAIL' || r.status === 'WARNING') && r.officerVerificationStatus === 'OFFICER_VERIFIED'
  ).length;

  const rejectedViolationsCount = scan.ruleResults.filter(
    r => (r.status === 'FAIL' || r.status === 'WARNING') && r.officerVerificationStatus === 'OFFICER_REJECTED'
  ).length;

  const pendingAiCount = scan.ruleResults.filter(
    r => (r.status === 'FAIL' || r.status === 'WARNING') && (!r.officerVerificationStatus || r.officerVerificationStatus === 'AI_DETECTED')
  ).length;

  const displayedRules = scan.ruleResults.filter(r => {
    if (selectedJurisdiction === 'ALL') return true;
    return r.jurisdiction === selectedJurisdiction;
  });

  // Readability & Font-Size Assessment (Rule 9) Statistics
  const readabilityAssessments = scan.readabilityAssessments || [];
  const readPassCount = readabilityAssessments.filter(r => r.result === 'PASS').length;
  const readFailCount = readabilityAssessments.filter(r => r.result === 'FAIL').length;
  const readReviewCount = readabilityAssessments.filter(r => r.result === 'REVIEW').length;
  const isCalibrated = Boolean(scan.calibration?.isCalibrated);

  // Handle Image Dimension Calibration (Rule 9)
  const handleCalibrate = async (e) => {
    if (e) e.preventDefault();
    setIsCalibrating(true);
    setCalibrationError(null);
    setCalibrationSuccess(null);

    try {
      let dimensionMm = Number(calibDimensionValue);
      if (calibUnit === 'cm') {
        dimensionMm = dimensionMm * 10;
      }

      const payload = {
        referenceType: calibReferenceType,
        referenceDimensionMm: dimensionMm,
        packageHeightCm: (calibReferenceType === 'PACKAGING_HEIGHT' && calibUnit === 'cm') ? Number(calibDimensionValue) : undefined,
        packageWidthCm: (calibReferenceType === 'PACKAGING_WIDTH' && calibUnit === 'cm') ? Number(calibDimensionValue) : undefined,
        customPixelsPerMm: customPxPerMm ? Number(customPxPerMm) : undefined
      };

      const res = await axios.post(`${API_URL}/api/scan/${scan._id}/calibrate`, payload);
      if (res.data?.success) {
        setScan(prev => ({
          ...prev,
          calibration: res.data.calibration,
          readabilityAssessments: res.data.readabilityAssessments
        }));
        setCalibrationSuccess(res.data.message);
        setTimeout(() => {
          setIsCalibrateOpen(false);
          setCalibrationSuccess(null);
        }, 1200);
      }
    } catch (err) {
      console.error('Calibration error:', err);
      setCalibrationError(err.response?.data?.error || 'Failed to calibrate image dimensions.');
    } finally {
      setIsCalibrating(false);
    }
  };

  // Handle Officer Adjudication (Accept, Reject, Edit Text, Change Category, Add Comments)
  const handleAdjudicate = async (newVerificationStatus, newRuleStatus = 'PASS') => {
    if (!activeRule) return;

    setIsSavingAdjudication(true);
    setAdjudicationMessage(null);

    try {
      const payload = {
        officerVerificationStatus: newVerificationStatus || activeRule.officerVerificationStatus || 'OFFICER_VERIFIED',
        status: newRuleStatus,
        officerComments: officerComments,
        extractedText: editedText,
        violationCategory: selectedCategory
      };

      const targetId = activeRule.evidenceId || activeRule.ruleId;
      const res = await axios.put(`${API_URL}/api/scan/${scan._id}/evidence/${targetId}`, payload);

      if (res.data?.success) {
        setScan(res.data.scan);
        setActiveRule(res.data.updatedEvidence);
        setAdjudicationMessage({
          type: 'success',
          text: newRuleStatus === 'PASS'
            ? `Accepted! Rule status updated to PASS (Green Tick). Compliance Score increased to ${res.data.scan.score}%.`
            : `Statutory violation confirmed. Compliance Score: ${res.data.scan.score}%.`
        });
      }
    } catch (err) {
      console.error('Failed to adjudicate evidence', err);
      setAdjudicationMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to save adjudication.'
      });
    } finally {
      setIsSavingAdjudication(false);
    }
  };

  // Handle Supplementary Evidence File Upload
  const handleUploadAdditionalEvidence = async (e) => {
    e.preventDefault();
    if (!uploadFile || !activeRule) return;

    setIsUploadingEvidence(true);
    const formData = new FormData();
    formData.append('evidenceFile', uploadFile);
    formData.append('notes', uploadNotes);

    try {
      const targetId = activeRule.evidenceId || activeRule.ruleId;
      const res = await axios.post(`${API_URL}/api/scan/${scan._id}/evidence/${targetId}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data?.success) {
        setUploadFile(null);
        setUploadNotes('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        await fetchScan();
      }
    } catch (err) {
      console.error('Failed to upload additional evidence', err);
      alert(err.response?.data?.error || 'Failed to upload file.');
    } finally {
      setIsUploadingEvidence(false);
    }
  };

  // PDF Export Generation
  const handleDownloadReport = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(20, 30, 70);
    doc.text("PACKSURE AI - LEGAL METROLOGY COMPLIANCE REPORT", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Scan ID: ${scan._id}`, 14, 28);
    doc.text(`Inspection Date: ${new Date(scan.inspectionDate || scan.timestamp).toLocaleString('en-IN')}`, 14, 34);
    doc.text(`Inspection State: ${scan.inspectionState || 'Central (All India)'}`, 14, 40);
    doc.text(`Legal Enforcement Status: ${scan.legalEnforcementStatus || 'PENDING_OFFICER_REVIEW'}`, 14, 46);
    doc.text(`Inspector: ${scan.inspectorName || 'Inspector Officer'}`, 14, 52);
    
    // Score Badge
    doc.setFillColor(scan.score >= 90 ? 220 : scan.score >= 70 ? 250 : 255, 
                     scan.score >= 90 ? 250 : scan.score >= 70 ? 240 : 220, 
                     scan.score >= 90 ? 230 : scan.score >= 70 ? 200 : 220);
    doc.rect(14, 58, 182, 14, "F");
    doc.setFontSize(11);
    doc.setTextColor(scan.score >= 90 ? 20 : scan.score >= 70 ? 120 : 150, 
                     scan.score >= 90 ? 100 : scan.score >= 70 ? 80 : 20, 
                     scan.score >= 90 ? 40 : scan.score >= 70 ? 10 : 20);
    doc.text(`COMPLIANCE SCORE: ${scan.score}%  |  VERIFIED VIOLATIONS: ${verifiedViolationsCount}  |  PENDING AI: ${pendingAiCount}  |  DISMISSED: ${rejectedViolationsCount}`, 18, 67);

    // Section 1: Extracted Information
    doc.setFontSize(13);
    doc.setTextColor(20, 30, 70);
    doc.text("1. Extracted Statutory Declarations", 14, 82);
    
    const infoRows = [
      ["Product Name", scan.extractedInfo?.productName || 'Not detected'],
      ["Product Category", scan.productCategory || scan.extractedInfo?.productCategory || 'General'],
      ["Net Quantity", scan.extractedInfo?.netQuantity || 'Not detected'],
      ["MRP", scan.extractedInfo?.mrp || 'Not detected'],
      ["Unit Sale Price (USP)", scan.extractedInfo?.unitSalePrice || 'Not detected'],
      ["Manufacturer / Packer", scan.extractedInfo?.manufacturer || 'Not detected'],
      ["Premises Address", scan.extractedInfo?.address || 'Not detected'],
      ["Month & Year of Mfg/Packing", scan.extractedInfo?.manufacturingDate || 'Not detected'],
      ["Consumer Care Contact", scan.extractedInfo?.consumerCare || 'Not detected'],
      ["Country of Origin", scan.extractedInfo?.countryOfOrigin || 'Not detected'],
    ];

    autoTable(doc, {
      startY: 86,
      head: [["Declaration Field", "Extracted Value"]],
      body: infoRows,
      theme: 'grid',
      headStyles: { fillColor: [40, 50, 90], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: { 0: { cellWidth: 55, fontStyle: 'bold' }, 1: { cellWidth: 127 } }
    });

    // Section 2: Statutory Rules & Evidence Audit
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(13);
    doc.setTextColor(20, 30, 70);
    doc.text("2. Evidence Audit & Officer Adjudication Ledger", 14, finalY);

    const ruleRows = scan.ruleResults.map(r => [
      r.ruleNumber || r.ruleId,
      r.ruleName,
      r.jurisdiction + (r.stateName ? ` (${r.stateName})` : ''),
      r.version ? `v${r.version}` : 'v1.0',
      r.status,
      r.officerVerificationStatus === 'OFFICER_VERIFIED' ? 'VERIFIED LEGAL VIOLATION' :
      r.officerVerificationStatus === 'OFFICER_REJECTED' ? 'REJECTED (DISMISSED)' : 'AI DETECTED (PENDING)',
      r.officerComments || r.explanation || ''
    ]);

    autoTable(doc, {
      startY: finalY + 4,
      head: [["Section", "Rule Title", "Jurisdiction", "Ver", "AI Status", "Officer Status", "Officer Comments / Notes"]],
      body: ruleRows,
      theme: 'grid',
      headStyles: { fillColor: [40, 50, 90], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 7, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 20, fontStyle: 'bold' },
        1: { cellWidth: 35 },
        2: { cellWidth: 22 },
        3: { cellWidth: 10 },
        4: { cellWidth: 18 },
        5: { cellWidth: 32, fontStyle: 'bold' },
        6: { cellWidth: 45 }
      },
      didParseCell: function (data) {
        if (data.section === 'body' && data.column.index === 4) {
          if (data.cell.raw === 'PASS') data.cell.styles.textColor = [16, 120, 50];
          else if (data.cell.raw === 'WARNING') data.cell.styles.textColor = [180, 100, 10];
          else if (data.cell.raw === 'FAIL') data.cell.styles.textColor = [180, 20, 20];
        }
        if (data.section === 'body' && data.column.index === 5) {
          if (data.cell.raw === 'VERIFIED LEGAL VIOLATION') {
            data.cell.styles.textColor = [180, 20, 20];
          } else if (data.cell.raw === 'REJECTED (DISMISSED)') {
            data.cell.styles.textColor = [100, 100, 100];
          } else {
            data.cell.styles.textColor = [180, 100, 10];
          }
        }
      }
    });

    // Section 3: Declaration Readability & Font-Size Assessment (Rule 9 Schedule II)
    if (scan.readabilityAssessments && scan.readabilityAssessments.length > 0) {
      const readY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(13);
      doc.setTextColor(20, 30, 70);
      doc.text("3. Declaration Readability & Font-Size Assessment (Rule 9)", 14, readY);

      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(
        scan.calibration?.isCalibrated
          ? `Calibration Status: Calibrated (${scan.calibration.pixelsPerMm} px/mm, ref: ${scan.calibration.referenceDimensionMm}mm)`
          : 'Calibration Status: Uncalibrated Photograph (Physical verification required per statutory rule)',
        14,
        readY + 5
      );

      const readabilityRows = scan.readabilityAssessments.map(item => [
        item.declaration,
        item.detectedText ? (item.detectedText.length > 32 ? item.detectedText.slice(0, 32) + '...' : item.detectedText) : 'Not detected',
        item.isCalibrated ? `${item.characterHeightMm} mm` : `${item.characterHeightPx} px (uncalibrated)`,
        item.readabilityStatus,
        `${Math.round((item.confidence || 0.9) * 100)}%`,
        item.result,
        item.applicableRequirement || 'Rule 9 font height standard'
      ]);

      autoTable(doc, {
        startY: readY + 8,
        head: [["Declaration", "Detected Text", "Est Size", "Readability", "Conf", "Result", "Statutory Requirement"]],
        body: readabilityRows,
        theme: 'grid',
        headStyles: { fillColor: [40, 50, 90], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 7, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 30, fontStyle: 'bold' },
          1: { cellWidth: 35 },
          2: { cellWidth: 24 },
          3: { cellWidth: 24 },
          4: { cellWidth: 12 },
          5: { cellWidth: 16, fontStyle: 'bold' },
          6: { cellWidth: 41 }
        },
        didParseCell: function (data) {
          if (data.section === 'body' && data.column.index === 5) {
            if (data.cell.raw === 'PASS') data.cell.styles.textColor = [16, 120, 50];
            else if (data.cell.raw === 'REVIEW') data.cell.styles.textColor = [180, 100, 10];
            else if (data.cell.raw === 'FAIL') data.cell.styles.textColor = [180, 20, 20];
          }
        }
      });
    }

    doc.save(`PackSure-Evidence-Report-${scan._id}.pdf`);
  };

  // CSV Export
  const handleDownloadCSV = () => {
    const headers = [
      "Rule ID",
      "Rule Number",
      "Rule Name",
      "Jurisdiction",
      "State",
      "Version",
      "AI Status",
      "Severity",
      "AI Confidence",
      "Officer Verification Status",
      "Officer Comments",
      "Extracted Text",
      "Violation Category",
      "Source Document"
    ];

    const rows = scan.ruleResults.map(r => [
      `"${r.ruleId || ''}"`,
      `"${r.ruleNumber || ''}"`,
      `"${(r.ruleName || '').replace(/"/g, '""')}"`,
      `"${r.jurisdiction || 'Central'}"`,
      `"${r.stateName || 'All India'}"`,
      `"${r.version || '1.0'}"`,
      `"${r.status || ''}"`,
      `"${r.severity || 'MEDIUM'}"`,
      `"${r.aiConfidence || 0.9}"`,
      `"${r.officerVerificationStatus || 'AI_DETECTED'}"`,
      `"${(r.officerComments || '').replace(/"/g, '""')}"`,
      `"${(r.extractedText || r.detectedValue || '').replace(/"/g, '""')}"`,
      `"${(r.violationCategory || '').replace(/"/g, '""')}"`,
      `"${(r.sourceDocument || '').replace(/"/g, '""')}"`
    ]);

    // Append Readability Assessment Section to CSV
    if (scan.readabilityAssessments && scan.readabilityAssessments.length > 0) {
      rows.push(["", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
      rows.push(["--- READABILITY & FONT SIZE ASSESSMENTS (RULE 9) ---", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
      rows.push([
        "Declaration",
        "Rule Ref",
        "Detected Text",
        "Est Size (mm/px)",
        "Is Calibrated",
        "Readability Status",
        "Confidence",
        "Result (PASS/FAIL/REVIEW)",
        "Applicable Requirement",
        "Explanation",
        "", "", "", ""
      ]);
      scan.readabilityAssessments.forEach(item => {
        rows.push([
          `"${item.declaration || ''}"`,
          `"${item.ruleNumber || ''}"`,
          `"${(item.detectedText || '').replace(/"/g, '""')}"`,
          `"${item.isCalibrated ? `${item.characterHeightMm} mm` : `${item.characterHeightPx} px`}"`,
          `"${item.isCalibrated ? 'YES' : 'NO'}"`,
          `"${item.readabilityStatus || ''}"`,
          `"${Math.round((item.confidence || 0.9) * 100)}%"`,
          `"${item.result || ''}"`,
          `"${(item.applicableRequirement || '').replace(/"/g, '""')}"`,
          `"${(item.explanation || '').replace(/"/g, '""')}"`,
          "", "", "", ""
        ]);
      });
    }

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `LegalMetrology-Evidence-${scan._id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 relative transition-colors duration-500">
      <div className="absolute top-[-10%] left-[-5%] w-96 h-96 bg-primary/20 blur-[120px] rounded-full pointer-events-none"></div>

      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
        <div className="flex items-center space-x-4">
          <Link 
            to="/scan" 
            className="p-3 bg-black/5 dark:bg-white/5 border border-border/50 rounded-2xl hover:bg-black/10 dark:hover:bg-white/10 transition-colors shadow-sm text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
              <Scale className="w-8 h-8 text-primary" />
              Inspection & Evidence Adjudication
            </h1>
            <p className="text-muted-foreground text-xs mt-1">
              Inspect packaging label, adjudicate AI candidates, manage photographic evidence, and confirm statutory violations.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={handleDownloadCSV}
            className="px-4 py-2.5 rounded-xl border border-border/60 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-foreground text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>

          <button 
            onClick={handleDownloadReport}
            className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4" />
            Official PDF Report
          </button>
        </div>
      </div>

      {/* Legal Enforcement Principle Notice */}
      <div className="relative z-10">
        {pendingAiCount > 0 ? (
          <div className="p-4 rounded-2xl bg-amber-100/90 border-2 border-amber-400 text-amber-950 flex items-start gap-3 shadow-md">
            <AlertOctagon className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed text-amber-950">
              <div className="font-black text-sm text-amber-950 mb-0.5 flex items-center gap-2">
                Preliminary AI Audit &bull; {pendingAiCount} Item(s) Pending Officer Verification
              </div>
              Under the Legal Metrology Act, 2009, <strong className="text-amber-950 font-black">AI detections cannot automatically become final legal violations without officer verification</strong>. Review each suspected anomaly below to formally Accept, Reject, or Edit before issuing an enforcement notice.
            </div>
          </div>
        ) : verifiedViolationsCount > 0 ? (
          <div className="p-4 rounded-2xl bg-rose-100/90 border-2 border-rose-400 text-rose-950 flex items-start gap-3 shadow-md">
            <ShieldCheck className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed text-rose-950">
              <div className="font-black text-sm text-rose-950 mb-0.5 flex items-center gap-2">
                Officer Verified Legal Violations ({verifiedViolationsCount}) &bull; Actionable for Enforcement
              </div>
              The inspecting officer has verified and signed off on <strong className="text-rose-950 font-black">{verifiedViolationsCount} statutory violation(s)</strong>. These items are legally binding and preserved in the official enforcement ledger.
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-emerald-100/90 border-2 border-emerald-400 text-emerald-950 flex items-start gap-3 shadow-md">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed text-emerald-950">
              <div className="font-black text-sm text-emerald-950 mb-0.5">
                Product Label Verified Compliant
              </div>
              All mandatory declarations are legally compliant or any candidate anomalies have been dismissed by the inspecting officer.
            </div>
          </div>
        )}
      </div>

      {/* Optical Blur & Image Clarity Advisory */}
      {scan.imageQuality?.isBlurry && (
        <div className="p-4 rounded-2xl bg-amber-100/90 border-2 border-amber-400 text-amber-950 flex items-start justify-between gap-4 shadow-md relative z-10 animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed text-amber-950">
              <div className="font-black text-sm text-amber-950 mb-0.5 flex items-center gap-2">
                Optical Blur Detected &bull; Quality Status: {scan.imageQuality.clarityStatus}
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-amber-300 text-amber-950 font-black border border-amber-500">
                  Clarity Score: {scan.imageQuality.blurScore}/100
                </span>
              </div>
              {scan.imageQuality.recommendation || 'The uploaded photograph exhibits optical or motion blur. Under Legal Metrology Rule 9, mandatory declarations must be legible and distinct. Physical verification is recommended.'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleOpenZoom(getImageUrl(scan.imagePath), 'Blur Inspection Lightbox')}
            className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shrink-0 flex items-center gap-1.5 transition-all shadow-sm"
          >
            <ZoomIn className="w-3.5 h-3.5" />
            Inspect Blur
          </button>
        </div>
      )}

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        
        {/* Left Column (5 Cols): Product Image with Visual Bounding Boxes & Extracted Info */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Packaging Image with Interactive Bounding Boxes */}
          <div className="glass dark:glass-dark rounded-3xl p-4 border border-border/50 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-foreground">Package Evidence Canvas</span>
              </div>
              <div className="flex items-center gap-2">
                {scan.imageQuality && (
                  <span 
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border flex items-center gap-1",
                      scan.imageQuality.clarityStatus === 'CRISP' 
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                        : scan.imageQuality.clarityStatus === 'ACCEPTABLE'
                        ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30"
                        : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                    )}
                    title={`Edge gradient variance: ${scan.imageQuality.edgeVariance || 'N/A'}`}
                  >
                    <span className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      scan.imageQuality.isBlurry ? "bg-amber-500 animate-ping" : "bg-emerald-500"
                    )}></span>
                    {scan.imageQuality.clarityStatus === 'CRISP' ? 'Sharp' :
                     scan.imageQuality.clarityStatus === 'ACCEPTABLE' ? 'Clear' :
                     scan.imageQuality.clarityStatus === 'MODERATE_BLUR' ? 'Blurry' : 'Severe Blur'}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleOpenZoom(getImageUrl(scan.imagePath), 'Packaging Evidence Canvas')}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all bg-black/5 dark:bg-white/5 hover:bg-primary/20 hover:text-primary text-muted-foreground border border-border/40 shadow-sm"
                  title="Click to zoom image in full screen"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                  Zoom In
                </button>
                <button
                  type="button"
                  onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    showBoundingBoxes 
                      ? 'bg-primary/20 text-primary border border-primary/30' 
                      : 'bg-black/5 dark:bg-white/5 text-muted-foreground'
                  }`}
                >
                  {showBoundingBoxes ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  {showBoundingBoxes ? 'Bounding Boxes ON' : 'Boxes Hidden'}
                </button>
              </div>
            </div>

            {/* Visual Canvas Container */}
            <div className="relative flex justify-center bg-black/5 dark:bg-black/40 rounded-2xl overflow-hidden p-2 min-h-[320px] items-center">
              <div 
                className="relative inline-block max-w-full cursor-zoom-in group"
                onClick={() => handleOpenZoom(getImageUrl(scan.imagePath), 'Packaging Evidence Canvas')}
                title="Click image to zoom in"
              >
                <img 
                  src={getImageUrl(scan.imagePath)} 
                  alt="Scanned Product Packaging" 
                  className="max-h-96 w-auto object-contain rounded-xl shadow-lg ring-1 ring-border/40 select-none transition-transform duration-200 group-hover:scale-[1.01]"
                  onError={(e) => {
                    const filename = scan.imagePath ? scan.imagePath.split(/[\/\\]/).pop() : '';
                    if (filename && !e.target.dataset.triedRelative) {
                      e.target.dataset.triedRelative = 'true';
                      e.target.src = `/uploads/${filename}`;
                    } else if (filename && !e.target.dataset.triedPort5000) {
                      e.target.dataset.triedPort5000 = 'true';
                      e.target.src = `http://localhost:5000/uploads/${filename}`;
                    } else if (filename && !e.target.dataset.triedIp) {
                      e.target.dataset.triedIp = 'true';
                      e.target.src = `http://127.0.0.1:5000/uploads/${filename}`;
                    }
                  }}
                />

                {/* Floating Click to Zoom badge on hover */}
                <div className="absolute bottom-2 right-2 px-2 py-1 rounded-md bg-black/75 text-white text-[10px] font-bold backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 pointer-events-none shadow-md">
                  <ZoomIn className="w-3 h-3 text-primary" /> Click to Zoom
                </div>

                {/* Overlaid Interactive Bounding Boxes: Statutory Mode */}
                {showBoundingBoxes && activeMainTab === 'statutory' && scan.ruleResults?.map((ruleItem) => {
                  const region = ruleItem.highlightedRegion || { x: 10, y: 10, width: 70, height: 18 };
                  const isSelected = activeRule?.ruleId === ruleItem.ruleId;
                  const isVerified = ruleItem.officerVerificationStatus === 'OFFICER_VERIFIED';
                  const isRejected = ruleItem.officerVerificationStatus === 'OFFICER_REJECTED';
                  const isAiPending = !isVerified && !isRejected;

                  // Only highlight violations (or selected rule)
                  const isNonPass = ruleItem.status === 'FAIL' || ruleItem.status === 'WARNING';
                  if (!isNonPass && !isSelected) return null;

                  return (
                    <div
                      key={ruleItem.ruleId}
                      onClick={(e) => {
                        e.stopPropagation(); // prevent triggering image zoom when clicking bounding box
                        setActiveRule(ruleItem);
                      }}
                      style={{
                        left: `${region.x}%`,
                        top: `${region.y}%`,
                        width: `${region.width}%`,
                        height: `${region.height}%`
                      }}
                      title={`${ruleItem.ruleNumber}: ${ruleItem.declarationType || ruleItem.ruleName} (${isVerified ? 'Officer Verified' : isRejected ? 'Officer Rejected' : 'AI Detected'})`}
                      className={cn(
                        "absolute rounded-lg border-2 cursor-pointer transition-all duration-300 z-10 group",
                        isSelected ? "ring-4 ring-primary shadow-xl scale-[1.02] z-20" : "hover:scale-[1.01]",
                        ruleItem.status === 'PASS' ? "border-emerald-500 bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.3)]" :
                        isVerified ? "border-rose-600 bg-rose-600/25 shadow-[0_0_15px_rgba(225,29,72,0.3)]" :
                        isRejected ? "border-zinc-500/60 bg-zinc-500/10 opacity-50 border-dashed" :
                        "border-amber-500 bg-amber-500/20 border-dashed animate-pulse"
                      )}
                    >
                      <span className={cn(
                        "absolute -top-3 left-1 text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm uppercase tracking-wider flex items-center gap-1",
                        ruleItem.status === 'PASS' ? "bg-emerald-600 text-white" :
                        isVerified ? "bg-rose-600 text-white" :
                        isRejected ? "bg-zinc-600 text-zinc-200" :
                        "bg-amber-500 text-black font-extrabold"
                      )}>
                        {ruleItem.status === 'PASS' ? 'VERIFIED PASS' : isVerified ? 'VERIFIED' : isRejected ? 'REJECTED' : 'AI SUSPECTED'}
                        <span className="opacity-90">• {ruleItem.ruleNumber || ruleItem.ruleId}</span>
                      </span>
                    </div>
                  );
                })}

                {/* Overlaid Interactive Bounding Boxes: Readability & Font-Size Mode (Rule 9) */}
                {showBoundingBoxes && activeMainTab === 'readability' && readabilityAssessments.map((item, idx) => {
                  const region = item.boundingBox || { x: 10, y: 10 + idx * 8, width: 60, height: 6 };
                  const isSelected = selectedReadabilityItem?.declaration === item.declaration;
                  const isPass = item.result === 'PASS';
                  const isFail = item.result === 'FAIL';

                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedReadabilityItem(item)}
                      style={{
                        left: `${region.x}%`,
                        top: `${region.y}%`,
                        width: `${region.width}%`,
                        height: `${region.height}%`
                      }}
                      title={`${item.declaration}: ${item.result} (${item.readabilityStatus}) - ${item.isCalibrated ? `${item.characterHeightMm}mm` : `${item.characterHeightPx}px`}`}
                      className={cn(
                        "absolute rounded-lg border-2 cursor-pointer transition-all duration-300 z-10 group",
                        isSelected ? "ring-4 ring-primary shadow-xl scale-[1.02] z-20" : "hover:scale-[1.01]",
                        isPass ? "border-emerald-500 bg-emerald-500/25 shadow-[0_0_12px_rgba(16,185,129,0.3)]" :
                        isFail ? "border-rose-600 bg-rose-600/25 shadow-[0_0_15px_rgba(225,29,72,0.3)]" :
                        "border-amber-500 bg-amber-500/25 border-dashed animate-pulse"
                      )}
                    >
                      <span className={cn(
                        "absolute -top-3 left-1 text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm uppercase tracking-wider flex items-center gap-1",
                        isPass ? "bg-emerald-600 text-white" :
                        isFail ? "bg-rose-600 text-white" :
                        "bg-amber-500 text-black font-extrabold"
                      )}>
                        {item.result} &bull; {item.declaration}
                        <span className="opacity-90 font-mono">
                          ({item.isCalibrated ? `${item.characterHeightMm}mm` : `${item.characterHeightPx}px`})
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Canvas Legend */}
            <div className="flex flex-wrap items-center justify-between text-[11px] text-muted-foreground pt-3 mt-2 border-t border-border/30 gap-2">
              {activeMainTab === 'statutory' ? (
                <>
                  <span className="flex items-center gap-1 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> AI Detected
                  </span>
                  <span className="flex items-center gap-1 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span> Officer Verified
                  </span>
                  <span className="flex items-center gap-1 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-zinc-500"></span> Officer Rejected
                  </span>
                </>
              ) : (
                <>
                  <span className="flex items-center gap-1 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> PASS (Compliant Height)
                  </span>
                  <span className="flex items-center gap-1 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> REVIEW (Uncalibrated / Verification Req.)
                  </span>
                  <span className="flex items-center gap-1 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span> FAIL (Below Min Size / Obstructed)
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Extracted Statutory Information Card */}
          <div className="glass dark:glass-dark rounded-3xl overflow-hidden shadow-xl border border-border/50">
            <div className="px-5 py-3.5 border-b border-border/50 bg-black/5 dark:bg-white/5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center">
                <FileText className="w-4 h-4 text-primary mr-2" />
                <h3 className="font-bold text-xs text-foreground uppercase tracking-wider">Statutory Label Declarations</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {scan.productCategory || 'General'}
                </span>

                <button
                  type="button"
                  onClick={() => handleExtractWithGemini()}
                  disabled={isExtractingGemini}
                  className="px-3 py-1 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-[11px] font-bold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                  title="Extract declarations directly with Gemini Multimodal AI"
                >
                  <Sparkles className={`w-3.5 h-3.5 text-amber-300 ${isExtractingGemini ? 'animate-spin' : ''}`} />
                  {isExtractingGemini ? 'Extracting with Gemini...' : 'Extract with Gemini AI'}
                </button>

                <button
                  type="button"
                  onClick={() => setIsGeminiModalOpen(true)}
                  className="p-1.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all border border-border/50"
                  title={geminiStatus.hasKey ? `Gemini API Key Configured (${geminiStatus.keyPreview})` : "Configure Gemini API Key"}
                >
                  <Key className={`w-3.5 h-3.5 ${geminiStatus.hasKey ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                </button>
              </div>
            </div>

            {geminiMessage && (
              <div className={`px-4 py-2 text-xs font-bold flex items-center justify-between border-b ${
                geminiMessage.type === 'success' 
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' 
                  : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
              }`}>
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  {geminiMessage.text}
                </span>
                <button onClick={() => setGeminiMessage(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="p-0 max-h-80 overflow-y-auto">
              <table className="w-full text-xs">
                <tbody>
                  {Object.entries(scan.extractedInfo || {}).map(([key, value]) => {
                    if (key === 'rawText' || key === 'prohibitedWords') return null;
                    const displayVal = (value === null || value === undefined || String(value).trim() === '' || String(value) === 'Not detected') 
                      ? 'Not detected' 
                      : String(value);
                    const isMissing = displayVal === 'Not detected';

                    return (
                      <tr key={key} className="border-b border-border/40 last:border-0 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-muted-foreground capitalize w-2/5">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </td>
                        <td className={cn(
                          "px-4 py-2.5 font-bold break-words",
                          isMissing ? "text-muted-foreground italic font-normal" : "text-foreground"
                        )}>
                          {displayVal}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (7 Cols): Rule Evaluation List & Officer Adjudication Workspace */}
        <div className="lg:col-span-7 space-y-6">

          {/* Module Mode Switcher: Statutory Rules vs Readability & Font-Size (Rule 9) */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-2 rounded-2xl glass dark:glass-dark border border-border/50 shadow-sm">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveMainTab('statutory')}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                  activeMainTab === 'statutory'
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                )}
              >
                <Scale className="w-4 h-4" />
                Statutory Rules & Evidence ({scan.ruleResults?.length || 0})
              </button>

              <button
                onClick={() => {
                  setActiveMainTab('readability');
                  if (!selectedReadabilityItem && readabilityAssessments.length > 0) {
                    setSelectedReadabilityItem(readabilityAssessments[0]);
                  }
                }}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                  activeMainTab === 'readability'
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                )}
              >
                <Eye className="w-4 h-4" />
                Readability & Font Size (Rule 9)
                <span className={cn(
                  "text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider",
                  isCalibrated 
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                    : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                )}>
                  {isCalibrated ? 'CALIBRATED' : 'UNCALIBRATED'}
                </span>
              </button>
            </div>

            <button
              onClick={() => setIsCalibrateOpen(true)}
              className="px-3.5 py-2 rounded-xl border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Ruler className="w-4 h-4" />
              {isCalibrated ? 'Recalibrate Scale' : 'Calibrate Dimensions'}
            </button>
          </div>

          {activeMainTab === 'statutory' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Adjudication Score & Counts Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="glass rounded-2xl p-4 border border-border/50 text-center shadow-sm">
              <div className="text-2xl font-black text-foreground">{scan.score}%</div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mt-0.5">Compliance Score</div>
            </div>

            <div className="glass rounded-2xl p-4 border border-rose-500/30 bg-rose-500/5 text-center shadow-sm">
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400">{verifiedViolationsCount}</div>
              <div className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-300 tracking-wider mt-0.5">Officer Verified</div>
            </div>

            <div className="glass rounded-2xl p-4 border border-amber-500/30 bg-amber-500/5 text-center shadow-sm">
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{pendingAiCount}</div>
              <div className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-300 tracking-wider mt-0.5">AI Pending</div>
            </div>

            <div className="glass rounded-2xl p-4 border border-border/50 text-center shadow-sm">
              <div className="text-2xl font-black text-muted-foreground">{rejectedViolationsCount}</div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mt-0.5">Dismissed</div>
            </div>
          </div>

          {/* Master Split Container: Left Rule List, Right Active Rule Workspace */}
          <div className="glass dark:glass-dark rounded-3xl overflow-hidden border border-border/50 shadow-xl flex flex-col md:flex-row min-h-[580px]">
            
            {/* Rule Selector List (40% width) */}
            <div className="w-full md:w-5/12 border-r border-border/50 flex flex-col bg-card/40">
              <div className="p-4 border-b border-border/50 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-primary" />
                    Statutory Rules ({scan.ruleResults.length})
                  </h3>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {failures} fails &bull; {warnings} warns
                  </span>
                </div>

                {/* Jurisdiction filter buttons */}
                <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-xl">
                  <button
                    onClick={() => setSelectedJurisdiction('ALL')}
                    className={cn(
                      "flex-1 py-1 text-[11px] font-bold rounded-lg transition-all",
                      selectedJurisdiction === 'ALL' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    All ({scan.ruleResults.length})
                  </button>
                  <button
                    onClick={() => setSelectedJurisdiction('Central')}
                    className={cn(
                      "flex-1 py-1 text-[11px] font-bold rounded-lg transition-all",
                      selectedJurisdiction === 'Central' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Central ({centralCount})
                  </button>
                  {stateCount > 0 && (
                    <button
                      onClick={() => setSelectedJurisdiction('State')}
                      className={cn(
                        "flex-1 py-1 text-[11px] font-bold rounded-lg transition-all",
                        selectedJurisdiction === 'State' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      State ({stateCount})
                    </button>
                  )}
                </div>
              </div>

              {/* Scrollable list of rules */}
              <div className="divide-y divide-border/40 flex-1 overflow-y-auto max-h-[520px]">
                {displayedRules.map((rule) => {
                  const isSelected = activeRule?.ruleId === rule.ruleId;
                  const isVerified = rule.officerVerificationStatus === 'OFFICER_VERIFIED';
                  const isRejected = rule.officerVerificationStatus === 'OFFICER_REJECTED';
                  const isNonPass = rule.status === 'FAIL' || rule.status === 'WARNING';

                  return (
                    <div 
                      key={rule.ruleId} 
                      onClick={() => setActiveRule(rule)}
                      className={cn(
                        "p-3.5 cursor-pointer transition-all duration-200 flex items-start group border-l-4",
                        isSelected 
                          ? "bg-primary/10 border-primary" 
                          : "border-transparent hover:bg-black/5 dark:hover:bg-white/5"
                      )}
                    >
                      {rule.status === 'PASS' ? <CheckCircle2 className="w-4 h-4 mr-2.5 flex-shrink-0 mt-0.5 text-emerald-500" /> :
                       rule.status === 'WARNING' ? <AlertTriangle className="w-4 h-4 mr-2.5 flex-shrink-0 mt-0.5 text-amber-500" /> :
                       <XCircle className="w-4 h-4 mr-2.5 flex-shrink-0 mt-0.5 text-rose-500" />}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[11px] font-mono font-bold text-primary truncate">
                            {rule.ruleNumber || rule.ruleId}
                          </span>
                          
                          {/* Verification badge */}
                          {isNonPass ? (
                            <span className={cn(
                              "text-[9px] px-1.5 py-0.2 rounded font-black uppercase",
                              isVerified ? "bg-rose-500/20 text-rose-600 dark:text-rose-400" :
                              isRejected ? "bg-zinc-500/20 text-zinc-500" :
                              "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                            )}>
                              {isVerified ? 'VERIFIED' : isRejected ? 'REJECTED' : 'AI DETECTED'}
                            </span>
                          ) : isVerified ? (
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-black uppercase bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                              VERIFIED
                            </span>
                          ) : null}
                        </div>

                        <h4 className={cn("text-xs font-bold leading-tight line-clamp-1", isSelected ? "text-foreground" : "text-foreground/80")}>
                          {rule.ruleName}
                        </h4>

                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-1">
                          <span className="px-1 rounded bg-black/5 dark:bg-white/5 font-mono">
                            {rule.jurisdiction === 'State' ? (rule.stateName || 'State') : 'Central'}
                          </span>
                          {rule.version && <span className="font-mono">v{rule.version}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Sub-Column: Active Rule Evidence & Officer Adjudication Workspace (60% width) */}
            <div className="w-full md:w-7/12 p-6 overflow-y-auto bg-card/60 space-y-5 max-h-[600px]">
              {activeRule ? (
                <div className="space-y-5 animate-in fade-in duration-200">
                  
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 pb-4 border-b border-border/40">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-black text-xs px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                          {activeRule.ruleNumber || activeRule.ruleId}
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground">
                          {activeRule.jurisdiction} {activeRule.stateName ? `(${activeRule.stateName})` : ''} &bull; v{activeRule.version || '1.0'}
                        </span>
                      </div>
                      <h3 className="text-base font-black text-foreground">
                        {activeRule.ruleName}
                      </h3>
                    </div>

                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider shrink-0",
                      activeRule.status === 'PASS' ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30" :
                      activeRule.status === 'WARNING' ? "bg-amber-500/15 text-amber-600 border border-amber-500/30" :
                      "bg-rose-500/15 text-rose-600 border border-rose-500/30"
                    )}>
                      {activeRule.status}
                    </span>
                  </div>

                  {/* Evidence Snapshot Card */}
                  <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-border/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Scan className="w-3.5 h-3.5 text-primary" />
                        Cropped Violation Evidence
                      </span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-primary/15 text-primary font-bold">
                        AI Confidence: {Math.round((activeRule.aiConfidence || 0.92) * 100)}%
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4 bg-background/80 p-3 rounded-xl border border-border/40">
                      {activeRule.croppedEvidenceUrl ? (
                        <div 
                          className="relative cursor-zoom-in group/crop shrink-0"
                          onClick={() => handleOpenZoom(getImageUrl(activeRule.croppedEvidenceUrl), `${activeRule.ruleNumber || 'Rule'} Cropped Evidence`)}
                          title="Click to zoom evidence image"
                        >
                          <img
                            src={getImageUrl(activeRule.croppedEvidenceUrl)}
                            alt="Cropped Evidence"
                            className="h-24 w-auto max-w-[160px] object-cover rounded-lg border border-border/60 shadow-sm transition-transform duration-150 group-hover/crop:scale-105"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/crop:opacity-100 transition-opacity rounded-lg flex items-center justify-center pointer-events-none">
                            <ZoomIn className="w-5 h-5 text-white drop-shadow-md" />
                          </div>
                        </div>
                      ) : (
                        <div className="h-20 w-36 bg-black/10 dark:bg-white/10 rounded-lg flex items-center justify-center text-[10px] text-muted-foreground">
                          Area Highlighted
                        </div>
                      )}

                      <div className="flex-1 min-w-0 text-xs space-y-1">
                        <div>
                          <span className="text-muted-foreground font-semibold">Declaration Type: </span>
                          <strong className="text-foreground">{activeRule.declarationType || 'Statutory Declaration'}</strong>
                        </div>
                        <div>
                          <span className="text-muted-foreground font-semibold">Violation Category: </span>
                          <strong className="text-rose-600 dark:text-rose-400">{activeRule.violationCategory || 'General Non-Compliance'}</strong>
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Region: x: {activeRule.highlightedRegion?.x}%, y: {activeRule.highlightedRegion?.y}% ({activeRule.highlightedRegion?.width}% x {activeRule.highlightedRegion?.height}%)
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Officer Adjudication Actions: Accept / Reject (only shown for non-pass rules) */}
                  {activeRule.status !== 'PASS' ? (
                    <div className="p-4 rounded-2xl border border-primary/30 bg-primary/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                          <UserCheck className="w-4 h-4 text-primary" />
                          Officer Legal Adjudication
                        </span>
                        
                        <span className={cn(
                          "px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider",
                          activeRule.officerVerificationStatus === 'OFFICER_VERIFIED' ? "bg-emerald-600 text-white" :
                          activeRule.officerVerificationStatus === 'OFFICER_REJECTED' ? "bg-zinc-600 text-white" :
                          "bg-amber-500 text-black font-extrabold"
                        )}>
                          {activeRule.officerVerificationStatus === 'OFFICER_VERIFIED' ? 'Officer Verified' :
                           activeRule.officerVerificationStatus === 'OFFICER_REJECTED' ? 'Officer Rejected' : 'AI Detected'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleAdjudicate('OFFICER_VERIFIED', 'PASS')}
                          disabled={isSavingAdjudication}
                          className="py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-600/30"
                        >
                          <CheckCircle2 className="w-4 h-4 text-white" />
                          Accept as Legal Violation (Turn Green & Pass)
                        </button>

                        <button
                          type="button"
                          onClick={() => handleAdjudicate('OFFICER_REJECTED', 'PASS')}
                          disabled={isSavingAdjudication}
                          className="py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm bg-black/5 dark:bg-white/5 hover:bg-emerald-600 hover:text-white text-muted-foreground border border-border/60"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Reject / Dismiss Anomaly
                        </button>
                      </div>

                      <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground border-t border-border/30">
                        <span>Confirm as genuine violation instead:</span>
                        <button
                          type="button"
                          onClick={() => handleAdjudicate('OFFICER_VERIFIED', 'FAIL')}
                          disabled={isSavingAdjudication}
                          className="text-rose-500 hover:text-rose-600 hover:underline font-bold flex items-center gap-1"
                        >
                          <AlertOctagon className="w-3.5 h-3.5" />
                          Confirm Statutory Violation (Keep FAIL)
                        </button>
                      </div>

                      {adjudicationMessage && (
                        <div className={`p-2.5 rounded-xl text-xs font-bold ${
                          adjudicationMessage.type === 'success' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                        }`}>
                          {adjudicationMessage.text}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 flex items-start justify-between gap-3 shadow-sm">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-xs font-bold text-emerald-900 dark:text-emerald-100 flex items-center gap-2">
                            Compliant Statutory Declaration
                            <span className="text-[10px] px-2 py-0.2 rounded-full font-mono font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                              PASS
                            </span>
                            {activeRule.officerVerificationStatus === 'OFFICER_VERIFIED' && (
                              <span className="text-[10px] px-2 py-0.2 rounded-full font-bold bg-emerald-600 text-white">
                                Officer Approved
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-emerald-800/80 dark:text-emerald-200/80 mt-1 leading-relaxed">
                            This mandatory declaration satisfies statutory Legal Metrology requirements and has been verified compliant. Compliance score has been credited.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAdjudicate('AI_DETECTED', 'FAIL')}
                        className="text-[11px] font-bold text-muted-foreground hover:text-rose-500 shrink-0 underline decoration-dotted transition-colors"
                        title="Re-open adjudication for this rule"
                      >
                        Re-evaluate
                      </button>
                    </div>
                  )}

                  {/* Edit Extracted Text & Change Category */}
                  <div className="space-y-3 text-xs">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-foreground flex items-center gap-1">
                          <Edit3 className="w-3.5 h-3.5 text-primary" />
                          Extracted Text / Detected Value:
                        </label>
                        {!isEditingText ? (
                          <button
                            onClick={() => setIsEditingText(true)}
                            className="text-primary hover:underline text-[11px] font-semibold"
                          >
                            Edit Text
                          </button>
                        ) : (
                          <button
                            onClick={() => setIsEditingText(false)}
                            className="text-muted-foreground hover:underline text-[11px]"
                          >
                            Cancel
                          </button>
                        )}
                      </div>

                      {isEditingText ? (
                        <div className="space-y-1.5">
                          <input
                            type="text"
                            value={editedText}
                            onChange={(e) => setEditedText(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-background border border-primary/50 text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary shadow-inner"
                            placeholder="Enter corrected extracted text..."
                          />
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-border/50 text-foreground font-mono">
                          {editedText || activeRule.detectedValue || 'Not detected'}
                        </div>
                      )}
                    </div>

                    {/* Change Violation Category */}
                    <div>
                      <label className="font-bold text-foreground block mb-1">
                        Violation Category:
                      </label>
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-border/50 text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                      >
                        <option value="Missing Mandatory Declaration">Missing Mandatory Declaration</option>
                        <option value="Improper MRP Declaration / Deceptive Pricing">Improper MRP Declaration / Deceptive Pricing</option>
                        <option value="Unit Sale Price Non-Compliance / Omission">Unit Sale Price Non-Compliance / Omission</option>
                        <option value="Net Quantity Declaration Non-Compliance">Net Quantity Declaration Non-Compliance</option>
                        <option value="Missing Generic / Common Commodity Name">Missing Generic / Common Commodity Name</option>
                        <option value="Missing or Incomplete Manufacturer / Packer Address">Missing or Incomplete Manufacturer / Packer Address</option>
                        <option value="Missing or Non-Compliant Date Declaration">Missing or Non-Compliant Date Declaration</option>
                        <option value="Font Size & Letter Height Non-Compliance">Font Size & Letter Height Non-Compliance</option>
                        <option value="Non-Metric or Illegal Symbol Used">Non-Metric or Illegal Symbol Used</option>
                        <option value="Deceptive Packaging / Prohibited Terms">Deceptive Packaging / Prohibited Terms</option>
                        <option value="Telangana Legal Metrology Registration Omission">Telangana Legal Metrology Registration Omission</option>
                        <option value="General Non-Compliance">General Non-Compliance</option>
                      </select>
                    </div>

                    {/* Officer Legal Comments */}
                    <div>
                      <label className="font-bold text-foreground block mb-1">
                        Officer Comments & Statutory Rationale:
                      </label>
                      <textarea
                        rows={2}
                        value={officerComments}
                        onChange={(e) => setOfficerComments(e.target.value)}
                        placeholder="Enter official enforcement observations, seizure notice reference, or justification..."
                        className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-border/50 text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/60 resize-none"
                      />
                    </div>

                    <button
                      onClick={() => handleAdjudicate(activeRule.officerVerificationStatus || 'AI_DETECTED')}
                      disabled={isSavingAdjudication}
                      className="w-full py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {isSavingAdjudication ? 'Saving Changes...' : 'Save Adjudication & Notes'}
                    </button>
                  </div>

                  {/* Supplementary Evidence Upload & Gallery */}
                  <div className="pt-3 border-t border-border/40 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground flex items-center gap-1.5">
                        <Paperclip className="w-3.5 h-3.5 text-primary" />
                        Supplementary Evidence Attachments ({activeRule.additionalEvidence?.length || 0})
                      </span>
                    </div>

                    {/* File upload form */}
                    <form onSubmit={handleUploadAdditionalEvidence} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => setUploadFile(e.target.files[0] || null)}
                          className="flex-1 text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Evidence notes (e.g. Seizure memo, weighing receipt)..."
                          value={uploadNotes}
                          onChange={(e) => setUploadNotes(e.target.value)}
                          className="flex-1 px-2.5 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 border border-border/50 text-xs text-foreground focus:outline-none"
                        />
                        <button
                          type="submit"
                          disabled={!uploadFile || isUploadingEvidence}
                          className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1 shrink-0"
                        >
                          <Upload className="w-3 h-3" />
                          {isUploadingEvidence ? 'Uploading...' : 'Attach'}
                        </button>
                      </div>
                    </form>

                    {/* Attached files list */}
                    {activeRule.additionalEvidence && activeRule.additionalEvidence.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        {activeRule.additionalEvidence.map((ev, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-black/5 dark:bg-white/5 border border-border/40 text-[11px]">
                            <div className="flex items-center gap-2 truncate">
                              <Paperclip className="w-3 h-3 text-primary shrink-0" />
                              <span className="font-semibold text-foreground truncate">{ev.originalName}</span>
                              {ev.notes && <span className="text-muted-foreground truncate">({ev.notes})</span>}
                            </div>
                            <a
                              href={`${API_URL}${ev.fileUrl}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:underline font-bold shrink-0 ml-2"
                            >
                              View
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Statutory Provenance Box */}
                  <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-border/50 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-bold uppercase tracking-wider text-[10px]">Statutory Authority</span>
                      {activeRule.sourceUrl && (
                        <a 
                          href={activeRule.sourceUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-primary hover:underline inline-flex items-center gap-1 font-semibold text-[11px]"
                        >
                          Gazette Portal <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <div className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-primary" /> {activeRule.sourceDocument}
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-1 border-t border-border/30">
                      <span>Section: <strong>{activeRule.ruleNumber || 'N/A'}</strong></span>
                      <Link
                        to={`/rules/history/${activeRule.ruleId}`}
                        className="text-primary font-bold hover:underline inline-flex items-center gap-1"
                      >
                        <GitBranch className="w-3 h-3" /> Audit Version History
                      </Link>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-xs py-20">
                  Select a rule from the left panel to inspect evidence and adjudicate.
                </div>
              )}
            </div>

          </div>
          </div>
        )}

        {/* Readability & Font-Size Assessment Section (Rule 9) */}
        {activeMainTab === 'readability' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            
            {/* Statutory Calibration Notice */}
            {isCalibrated ? (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 flex items-start justify-between gap-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                  <div className="text-xs leading-relaxed text-emerald-950">
                    <div className="font-black text-sm text-emerald-950 mb-0.5 flex items-center gap-2">
                      Image Calibrated: {scan.calibration.pixelsPerMm} px/mm
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-200 text-emerald-950 font-black border border-emerald-300">
                        {scan.calibration.referenceType} ({scan.calibration.referenceDimensionMm} mm)
                      </span>
                    </div>
                    Physical character heights have been mathematically calibrated from packaging reference dimensions and evaluated against statutory minimum thresholds in Rule 9 Schedule II Table I & II.
                  </div>
                </div>
                <button
                  onClick={() => setIsCalibrateOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Recalibrate
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-amber-100/90 border-2 border-amber-400 text-amber-950 flex items-start justify-between gap-4 shadow-md">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div className="text-xs leading-relaxed text-amber-950">
                    <div className="font-black text-sm text-amber-950 mb-0.5 flex items-center gap-2">
                      Statutory Uncalibrated Photograph Notice &bull; Physical Verification Required
                    </div>
                    Under the Legal Metrology (Packaged Commodities) Rules, 2011, <strong className="text-amber-950 font-black">exact physical font size in millimeters cannot be legally determined from an uncalibrated photograph</strong>. Declarations requiring physical height confirmation are marked as <strong className="text-amber-950 font-black">REVIEW</strong>. Provide packaging reference dimensions to enable millimeter calibration.
                  </div>
                </div>
                <button
                  onClick={() => setIsCalibrateOpen(true)}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shrink-0 flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Ruler className="w-4 h-4" />
                  Calibrate Dimensions
                </button>
              </div>
            )}

            {/* Readability Assessment KPI summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="glass rounded-2xl p-4 border border-border/50 text-center shadow-sm">
                <div className="text-xl font-black text-foreground">
                  {isCalibrated ? `${scan.calibration.pixelsPerMm} px/mm` : 'Uncalibrated'}
                </div>
                <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mt-0.5">Scale Resolution</div>
              </div>

              <div className="glass rounded-2xl p-4 border border-emerald-500/30 bg-emerald-500/5 text-center shadow-sm">
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{readPassCount}</div>
                <div className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300 tracking-wider mt-0.5">Rule 9 Pass</div>
              </div>

              <div className="glass rounded-2xl p-4 border border-amber-500/30 bg-amber-500/5 text-center shadow-sm">
                <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{readReviewCount}</div>
                <div className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-300 tracking-wider mt-0.5">Review Required</div>
              </div>

              <div className="glass rounded-2xl p-4 border border-rose-500/30 bg-rose-500/5 text-center shadow-sm">
                <div className="text-2xl font-black text-rose-600 dark:text-rose-400">{readFailCount}</div>
                <div className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-300 tracking-wider mt-0.5">Non-Compliant</div>
              </div>
            </div>

            {/* Readability & Font-Size Assessment Master Table */}
            <div className="glass dark:glass-dark rounded-3xl overflow-hidden border border-border/50 shadow-xl">
              <div className="p-4 border-b border-border/50 bg-black/5 dark:bg-white/5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-primary" />
                  <h3 className="font-bold text-xs uppercase tracking-wider text-foreground">
                    Declaration Readability & Font-Size Assessment Ledger
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-muted-foreground">
                  Legal Reference: Rule 9 & Schedule II (Packaged Commodities Rules)
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border/50 bg-black/10 dark:bg-white/5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      <th className="py-3 px-4">Declaration</th>
                      <th className="py-3 px-3">Detected Text</th>
                      <th className="py-3 px-3">Bounding Box</th>
                      <th className="py-3 px-3">Readability Status</th>
                      <th className="py-3 px-3">Est. Character Size</th>
                      <th className="py-3 px-2 text-center">Conf.</th>
                      <th className="py-3 px-3">Applicable Requirement</th>
                      <th className="py-3 px-4 text-center">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {readabilityAssessments.map((item, idx) => {
                      const isSelected = selectedReadabilityItem?.declaration === item.declaration;
                      return (
                        <tr
                          key={idx}
                          onClick={() => setSelectedReadabilityItem(item)}
                          className={cn(
                            "cursor-pointer transition-colors duration-150",
                            isSelected 
                              ? "bg-primary/10 font-medium" 
                              : "hover:bg-black/5 dark:hover:bg-white/5"
                          )}
                        >
                          {/* 1. Declaration */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-foreground flex items-center gap-1.5">
                              {item.declaration}
                            </div>
                            <div className="text-[10px] font-mono text-primary mt-0.5">
                              {item.ruleNumber || item.ruleId}
                            </div>
                          </td>

                          {/* 2. Detected Text */}
                          <td className="py-3.5 px-3 max-w-[140px]">
                            {item.detectedText && item.detectedText !== 'Not detected on package label' ? (
                              <span className="font-mono text-[11px] text-foreground bg-black/5 dark:bg-white/5 px-2 py-1 rounded-md block truncate" title={item.detectedText}>
                                {item.detectedText}
                              </span>
                            ) : (
                              <span className="italic text-muted-foreground text-[11px]">
                                Not detected
                              </span>
                            )}
                          </td>

                          {/* 3. Bounding Box */}
                          <td className="py-3.5 px-3">
                            <div className="font-mono text-[10px] text-muted-foreground bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded inline-block">
                              [{item.boundingBox?.x || 0}%, {item.boundingBox?.y || 0}%, {item.boundingBox?.width || 0}% × {item.boundingBox?.height || 0}%]
                            </div>
                          </td>

                          {/* 4. Readability Status */}
                          <td className="py-3.5 px-3">
                            <div className="space-y-1">
                              <span className={cn(
                                "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase inline-flex items-center gap-1",
                                item.readabilityStatus === 'CLEAR & DISTINCT' ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30" :
                                item.readabilityStatus.includes('BLUR') ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30" :
                                item.readabilityStatus.includes('CONTRAST') ? "bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30" :
                                item.readabilityStatus.includes('OBSTRUCTED') ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30" :
                                item.readabilityStatus.includes('SMALL') ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30" :
                                "bg-zinc-500/15 text-zinc-500 border border-zinc-500/30"
                              )}>
                                {item.readabilityStatus}
                              </span>
                              {item.metrics && (
                                <div className="text-[9px] text-muted-foreground font-mono">
                                  Blur: {item.metrics.blurScore || 85} &bull; Contrast: {item.metrics.contrastRatio || 55}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* 5. Estimated Character Size */}
                          <td className="py-3.5 px-3">
                            {item.isCalibrated ? (
                              <div>
                                <span className="font-bold font-mono text-sm text-primary">
                                  ~{item.characterHeightMm} mm
                                </span>
                                <span className="text-[10px] text-muted-foreground ml-1">
                                  ({item.characterHeightPx} px)
                                </span>
                              </div>
                            ) : (
                              <div>
                                <span className="font-mono text-xs font-bold text-foreground">
                                  ~{item.characterHeightPx} px
                                </span>
                                <span className="text-[9px] block text-amber-600 dark:text-amber-400 font-semibold">
                                  (uncalibrated photo)
                                </span>
                              </div>
                            )}
                          </td>

                          {/* 6. Confidence */}
                          <td className="py-3.5 px-2 text-center">
                            <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                              {Math.round((item.confidence || 0.94) * 100)}%
                            </span>
                          </td>

                          {/* 7. Applicable Requirement */}
                          <td className="py-3.5 px-3 max-w-[190px]">
                            <p className="text-[11px] text-muted-foreground line-clamp-2" title={item.applicableRequirement}>
                              {item.applicableRequirement}
                            </p>
                          </td>

                          {/* 8. Result (PASS / FAIL / REVIEW) */}
                          <td className="py-3.5 px-4 text-center">
                            <span className={cn(
                              "text-[11px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider inline-flex items-center gap-1",
                              item.result === 'PASS' ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40" :
                              item.result === 'REVIEW' ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40" :
                              "bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/40"
                            )}>
                              {item.result === 'PASS' && <Check className="w-3 h-3" />}
                              {item.result === 'REVIEW' && <HelpCircle className="w-3 h-3" />}
                              {item.result === 'FAIL' && <X className="w-3 h-3" />}
                              {item.result}
                            </span>
                            {item.result === 'REVIEW' && (
                              <div className="text-[9px] text-amber-600 dark:text-amber-400 mt-0.5">
                                Physical verification req.
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Selected Declaration Optical Diagnostic Inspector Drawer */}
            {selectedReadabilityItem && (
              <div className="glass dark:glass-dark rounded-3xl p-5 border border-border/50 shadow-xl space-y-4 animate-in fade-in duration-150">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/40">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <h4 className="text-sm font-black text-foreground">
                      Optical Diagnostic: {selectedReadabilityItem.declaration}
                    </h4>
                    <span className="text-xs text-muted-foreground font-mono">
                      ({selectedReadabilityItem.ruleNumber})
                    </span>
                  </div>

                  <span className={cn(
                    "px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider",
                    selectedReadabilityItem.result === 'PASS' ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40" :
                    selectedReadabilityItem.result === 'REVIEW' ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40" :
                    "bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/40"
                  )}>
                    Assessment Result: {selectedReadabilityItem.result}
                  </span>
                </div>

                {/* Statutory Explanation Notice */}
                <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-border/40 text-xs text-foreground leading-relaxed">
                  <strong>Statutory Assessment Rationale:</strong> {selectedReadabilityItem.explanation}
                </div>

                {/* Optical Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-border/40 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Blur & Sharpness</span>
                    <div className="font-bold text-foreground flex items-center justify-between">
                      <span>{selectedReadabilityItem.metrics?.blurDetected ? 'Blurry' : 'Sharp'}</span>
                      <span className="font-mono text-primary">{selectedReadabilityItem.metrics?.blurScore || 85}/100</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-border/40 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Contrast Ratio</span>
                    <div className="font-bold text-foreground flex items-center justify-between">
                      <span>{selectedReadabilityItem.metrics?.lowContrast ? 'Low Contrast' : 'High Contrast'}</span>
                      <span className="font-mono text-primary">{selectedReadabilityItem.metrics?.contrastRatio || 55}/100</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-border/40 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Surface & Glare</span>
                    <div className="font-bold text-foreground">
                      {selectedReadabilityItem.metrics?.obstructionDetected ? 'Obstruction/Glare' : 'Clear Surface'}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-border/40 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Character Height</span>
                    <div className="font-bold text-foreground">
                      {selectedReadabilityItem.isCalibrated 
                        ? `${selectedReadabilityItem.characterHeightMm} mm (Calibrated)` 
                        : `${selectedReadabilityItem.characterHeightPx} px (Uncalibrated)`}
                    </div>
                  </div>
                </div>

                {/* Requirement details */}
                <div className="text-xs text-muted-foreground pt-2 border-t border-border/30 flex items-center justify-between">
                  <span>Applicable Mandate: <strong>{selectedReadabilityItem.applicableRequirement}</strong></span>
                  {!selectedReadabilityItem.isCalibrated && (
                    <button
                      onClick={() => setIsCalibrateOpen(true)}
                      className="text-primary hover:underline font-bold inline-flex items-center gap-1"
                    >
                      <Ruler className="w-3.5 h-3.5" /> Calibrate to test font height in mm
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        </div>

      </div>

      {/* Raw Transcription Ledger */}
      <div className="mt-8 relative z-10">
        <div className="glass rounded-3xl border border-border/50 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border/50 bg-black/5 dark:bg-white/5 flex items-center justify-between">
            <div className="flex items-center">
              <FileText className="w-4 h-4 mr-2 text-primary" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-foreground">Label OCR Raw Transcription Ledger</h3>
            </div>
            <span className="text-[11px] font-mono text-muted-foreground">
              Inspection Date: {new Date(scan.inspectionDate || scan.timestamp).toLocaleDateString('en-IN')}
            </span>
          </div>
          <div className="p-6 bg-black/5 dark:bg-black/40">
            <pre className="text-xs font-mono text-foreground/80 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
              {scan.extractedText || "No readable raw text captured."}
            </pre>
          </div>
        </div>
      </div>

      {/* Packaging Dimension Calibration Modal Dialog */}
      {isCalibrateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass dark:glass-dark rounded-3xl max-w-lg w-full p-6 border border-border/60 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <div className="flex items-center gap-2.5">
                <Ruler className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-black text-foreground">
                  Packaging Dimension Calibration
                </h3>
              </div>
              <button
                onClick={() => setIsCalibrateOpen(false)}
                className="p-1.5 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Statutory font height requirements under <strong>Rule 9 Schedule II</strong> specify minimum numeral/letter dimensions in millimeters (e.g. 1.0mm, 1.5mm, 2.0mm, 4.0mm). Enter the physical packaging dimensions to establish the optical millimeter scale.
            </p>

            {calibrationError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                {calibrationError}
              </div>
            )}

            {calibrationSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                {calibrationSuccess}
              </div>
            )}

            <form onSubmit={handleCalibrate} className="space-y-4">
              {/* Reference Dimension Selector */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5 uppercase tracking-wider">
                  Reference Type
                </label>
                <select
                  value={calibReferenceType}
                  onChange={(e) => setCalibReferenceType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-border/50 text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  <option value="PACKAGING_HEIGHT">Total Packaging Height (Vertical Container Span)</option>
                  <option value="PACKAGING_WIDTH">Total Packaging Width (Horizontal Container Span)</option>
                  <option value="KNOWN_MARKER">Known Marker / Vernier Calibration Reticle</option>
                  <option value="CUSTOM_DIMENSION">Direct Optical Scale Override (px/mm)</option>
                </select>
              </div>

              {calibReferenceType !== 'CUSTOM_DIMENSION' ? (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Physical Dimension
                    </label>
                    <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-0.5 rounded-lg text-[11px]">
                      <button
                        type="button"
                        onClick={() => {
                          if (calibUnit === 'mm') {
                            setCalibDimensionValue((Number(calibDimensionValue) / 10).toString());
                            setCalibUnit('cm');
                          }
                        }}
                        className={cn(
                          "px-2 py-0.5 rounded font-bold transition-all",
                          calibUnit === 'cm' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                        )}
                      >
                        cm
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (calibUnit === 'cm') {
                            setCalibDimensionValue((Number(calibDimensionValue) * 10).toString());
                            setCalibUnit('mm');
                          }
                        }}
                        className={cn(
                          "px-2 py-0.5 rounded font-bold transition-all",
                          calibUnit === 'mm' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                        )}
                      >
                        mm
                      </button>
                    </div>
                  </div>

                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    required
                    value={calibDimensionValue}
                    onChange={(e) => setCalibDimensionValue(e.target.value)}
                    placeholder={`e.g. ${calibUnit === 'cm' ? '20' : '200'}`}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-border/50 text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  />

                  {/* Quick Presets */}
                  <div className="pt-2">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block mb-1">
                      Quick Package Category Presets
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: 'Small Pouch / Sachet (12 cm)', val: calibUnit === 'cm' ? '12' : '120' },
                        { label: 'Bottle / Carton (20 cm)', val: calibUnit === 'cm' ? '20' : '200' },
                        { label: 'Cereal / Box (26 cm)', val: calibUnit === 'cm' ? '26' : '260' },
                        { label: 'Large Tin / Jar (32 cm)', val: calibUnit === 'cm' ? '32' : '320' },
                      ].map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setCalibDimensionValue(preset.val)}
                          className="px-2.5 py-1 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-primary/15 text-[11px] text-muted-foreground hover:text-primary transition-colors border border-border/40"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5 uppercase tracking-wider">
                    Optical Density Scale (Pixels per Millimeter)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    required
                    value={customPxPerMm}
                    onChange={(e) => setCustomPxPerMm(e.target.value)}
                    placeholder="e.g. 14.50 px/mm"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-border/50 text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
              )}

              <div className="pt-3 border-t border-border/40 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCalibrateOpen(false)}
                  className="px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-foreground text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCalibrating}
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  {isCalibrating ? 'Calibrating...' : 'Apply Calibration & Re-evaluate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Interactive High-Resolution Image Zoom Lightbox Modal */}
      {zoomModal.isOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col animate-in fade-in duration-200 select-none"
          onClick={handleCloseZoom}
        >
          {/* Top Control Bar */}
          <div 
            className="flex items-center justify-between px-6 py-4 bg-black/60 border-b border-white/10 text-white z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <ImageIcon className="w-5 h-5 text-primary" />
              <div>
                <h3 className="text-sm font-bold text-white leading-tight">
                  {zoomModal.title}
                </h3>
                <p className="text-[11px] text-white/60">
                  Use zoom controls or drag to inspect packaging declarations and fine print
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Zoom Out */}
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoomModal.scale <= 0.5}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white disabled:opacity-40 transition-colors"
                title="Zoom Out (-)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              {/* Zoom Scale Badge */}
              <span className="px-3 py-1 rounded-xl bg-white/10 text-xs font-mono font-bold text-white min-w-[56px] text-center">
                {Math.round(zoomModal.scale * 100)}%
              </span>

              {/* Zoom In */}
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoomModal.scale >= 4}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white disabled:opacity-40 transition-colors"
                title="Zoom In (+)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              {/* Rotate */}
              <button
                type="button"
                onClick={handleRotate}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Rotate Clockwise (90°)"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              {/* Reset Zoom */}
              <button
                type="button"
                onClick={handleResetZoom}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors flex items-center gap-1"
                title="Reset to 100%"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reset
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={handleCloseZoom}
                className="p-2 ml-2 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white transition-colors"
                title="Close Lightbox (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Interactive Zoomable Viewport */}
          <div 
            className="flex-1 overflow-auto flex items-center justify-center p-6 cursor-grab active:cursor-grabbing"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleCloseZoom();
              }
            }}
          >
            <div 
              className="relative transition-transform duration-200 ease-out origin-center"
              style={{
                transform: `scale(${zoomModal.scale}) rotate(${zoomModal.rotation}deg)`
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={zoomModal.imageUrl}
                alt={zoomModal.title}
                className="max-w-[85vw] max-h-[75vh] object-contain rounded-xl shadow-2xl ring-1 ring-white/20"
                onError={(e) => {
                  const filename = zoomModal.imageUrl ? zoomModal.imageUrl.split(/[\/\\]/).pop() : '';
                  if (filename && !e.target.dataset.triedFallback) {
                    e.target.dataset.triedFallback = 'true';
                    e.target.src = `/uploads/${filename}`;
                  }
                }}
              />
            </div>
          </div>

          {/* Bottom Hint */}
          <div className="px-6 py-2.5 bg-black/60 border-t border-white/10 text-center text-[11px] text-white/60">
            Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px] text-white">Esc</kbd> to close &bull; Click + / - to zoom up to 400%
          </div>
        </div>
      )}

      {/* Gemini API Key Configuration Modal */}
      {isGeminiModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border/70 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-purple-500/20 to-indigo-500/20 border border-purple-500/30 text-purple-600 dark:text-purple-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-foreground tracking-tight">Google Gemini Vision AI</h3>
                  <p className="text-xs text-muted-foreground">Automated packaging declarations extractor</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsGeminiModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Google Gemini Multimodal Vision reads the high-resolution packaging image directly and extracts mandatory Legal Metrology fields (dimensions, manufacturer, complete address, dates, MRP, batch number) with state-of-the-art optical accuracy.
            </p>

            {geminiStatus.hasKey && (
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-bold">
                  <CheckCircle2 className="w-4 h-4" /> Active Key: {geminiStatus.keyPreview}
                </span>
                <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-emerald-500/20">Configured</span>
              </div>
            )}

            <form onSubmit={handleSaveGeminiKey} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Gemini API Key:
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={geminiApiKeyInput}
                    onChange={(e) => setGeminiApiKeyInput(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border/70 bg-background text-foreground text-xs font-mono pr-10 focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground p-0.5"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  Need a key? <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-bold">Get a free key from Google AI Studio &rarr;</a>
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsGeminiModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border/60 text-xs font-bold text-muted-foreground hover:text-foreground transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isExtractingGemini || !geminiApiKeyInput || geminiApiKeyInput.trim().length < 10}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  Save & Extract Declarations
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
