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
  Image as ImageIcon
} from 'lucide-react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { cn, API_URL } from '../lib/utils';

export default function ResultsPage() {
  const { id } = useParams();
  const [scan, setScan] = useState(null);
  const [activeRule, setActiveRule] = useState(null);
  const [selectedJurisdiction, setSelectedJurisdiction] = useState('ALL'); // 'ALL' | 'Central' | 'State'
  const [loading, setLoading] = useState(true);

  // Evidence Management UI State
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const [isEditingText, setIsEditingText] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [officerComments, setOfficerComments] = useState('');
  const [isSavingAdjudication, setIsSavingAdjudication] = useState(false);
  const [adjudicationMessage, setAdjudicationMessage] = useState(null);

  // Additional Evidence Upload State
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadNotes, setUploadNotes] = useState('');
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);
  const fileInputRef = useRef(null);

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

  // Handle Officer Adjudication (Accept, Reject, Edit Text, Change Category, Add Comments)
  const handleAdjudicate = async (newStatus) => {
    if (!activeRule) return;

    setIsSavingAdjudication(true);
    setAdjudicationMessage(null);

    try {
      const payload = {
        officerVerificationStatus: newStatus || activeRule.officerVerificationStatus || 'AI_DETECTED',
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
          text: `Evidence adjudicated as ${newStatus === 'OFFICER_VERIFIED' ? 'Officer Verified' : newStatus === 'OFFICER_REJECTED' ? 'Officer Rejected' : 'Updated'}.`
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
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 flex items-start gap-3 shadow-sm">
            <AlertOctagon className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <div className="font-bold text-sm text-amber-900 dark:text-amber-100 mb-0.5 flex items-center gap-2">
                Preliminary AI Audit &bull; {pendingAiCount} Item(s) Pending Officer Verification
              </div>
              Under the Legal Metrology Act, 2009, <strong>AI detections cannot automatically become final legal violations without officer verification</strong>. Review each suspected anomaly below to formally Accept, Reject, or Edit before issuing an enforcement notice.
            </div>
          </div>
        ) : verifiedViolationsCount > 0 ? (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-200 flex items-start gap-3 shadow-sm">
            <ShieldCheck className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <div className="font-bold text-sm text-rose-900 dark:text-rose-100 mb-0.5 flex items-center gap-2">
                Officer Verified Legal Violations ({verifiedViolationsCount}) &bull; Actionable for Enforcement
              </div>
              The inspecting officer has verified and signed off on {verifiedViolationsCount} statutory violation(s). These items are legally binding and preserved in the official enforcement ledger.
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 flex items-start gap-3 shadow-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <div className="font-bold text-sm text-emerald-900 dark:text-emerald-100 mb-0.5">
                Product Label Verified Compliant
              </div>
              All mandatory declarations are legally compliant or any candidate anomalies have been dismissed by the inspecting officer.
            </div>
          </div>
        )}
      </div>

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
              <button
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

            {/* Visual Canvas Container */}
            <div className="relative flex justify-center bg-black/5 dark:bg-black/40 rounded-2xl overflow-hidden p-2 min-h-[320px] items-center">
              <div className="relative inline-block max-w-full">
                <img 
                  src={`${API_URL}/${scan.imagePath}`} 
                  alt="Scanned Product Packaging" 
                  className="max-h-96 w-auto object-contain rounded-xl shadow-lg ring-1 ring-border/40 select-none pointer-events-none"
                  onError={(e) => { e.target.src = 'https://via.placeholder.com/350'; }}
                />

                {/* Overlaid Interactive Bounding Boxes */}
                {showBoundingBoxes && scan.ruleResults?.map((ruleItem) => {
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
                      onClick={() => setActiveRule(ruleItem)}
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
                        isVerified ? "border-rose-600 bg-rose-600/25 shadow-[0_0_15px_rgba(225,29,72,0.3)]" :
                        isRejected ? "border-zinc-500/60 bg-zinc-500/10 opacity-50 border-dashed" :
                        "border-amber-500 bg-amber-500/20 border-dashed animate-pulse"
                      )}
                    >
                      <span className={cn(
                        "absolute -top-3 left-1 text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm uppercase tracking-wider flex items-center gap-1",
                        isVerified ? "bg-rose-600 text-white" :
                        isRejected ? "bg-zinc-600 text-zinc-200" :
                        "bg-amber-500 text-black font-extrabold"
                      )}>
                        {isVerified ? 'VERIFIED' : isRejected ? 'REJECTED' : 'AI SUSPECTED'}
                        <span className="opacity-90">• {ruleItem.ruleNumber || ruleItem.ruleId}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Canvas Legend */}
            <div className="flex flex-wrap items-center justify-between text-[11px] text-muted-foreground pt-3 mt-2 border-t border-border/30 gap-2">
              <span className="flex items-center gap-1 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> AI Detected
              </span>
              <span className="flex items-center gap-1 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span> Officer Verified
              </span>
              <span className="flex items-center gap-1 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-500"></span> Officer Rejected
              </span>
            </div>
          </div>

          {/* Extracted Statutory Information Card */}
          <div className="glass dark:glass-dark rounded-3xl overflow-hidden shadow-xl border border-border/50">
            <div className="px-5 py-3.5 border-b border-border/50 bg-black/5 dark:bg-white/5 flex items-center justify-between">
              <div className="flex items-center">
                <FileText className="w-4 h-4 text-primary mr-2" />
                <h3 className="font-bold text-xs text-foreground uppercase tracking-wider">Statutory Label Declarations</h3>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {scan.productCategory || 'General'}
              </span>
            </div>
            <div className="p-0 max-h-72 overflow-y-auto">
              <table className="w-full text-xs">
                <tbody>
                  {Object.entries(scan.extractedInfo || {}).map(([key, value]) => {
                    if (key === 'rawText' || key === 'prohibitedWords') return null;
                    return (
                      <tr key={key} className="border-b border-border/40 last:border-0 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-muted-foreground capitalize w-2/5">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </td>
                        <td className="px-4 py-2.5 font-bold text-foreground break-words">{String(value)}</td>
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
                          {isNonPass && (
                            <span className={cn(
                              "text-[9px] px-1.5 py-0.2 rounded font-black uppercase",
                              isVerified ? "bg-rose-500/20 text-rose-600 dark:text-rose-400" :
                              isRejected ? "bg-zinc-500/20 text-zinc-500" :
                              "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                            )}>
                              {isVerified ? 'VERIFIED' : isRejected ? 'REJECTED' : 'AI DETECTED'}
                            </span>
                          )}
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
                        <img
                          src={`${API_URL}${activeRule.croppedEvidenceUrl}`}
                          alt="Cropped Evidence"
                          className="h-24 w-auto max-w-[160px] object-cover rounded-lg border border-border/60 shadow-sm"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
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

                  {/* Officer Adjudication Actions: Accept / Reject */}
                  <div className="p-4 rounded-2xl border border-primary/30 bg-primary/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-primary" />
                        Officer Legal Adjudication
                      </span>
                      
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider",
                        activeRule.officerVerificationStatus === 'OFFICER_VERIFIED' ? "bg-rose-600 text-white" :
                        activeRule.officerVerificationStatus === 'OFFICER_REJECTED' ? "bg-zinc-600 text-white" :
                        "bg-amber-500 text-black font-extrabold"
                      )}>
                        {activeRule.officerVerificationStatus === 'OFFICER_VERIFIED' ? 'Officer Verified' :
                         activeRule.officerVerificationStatus === 'OFFICER_REJECTED' ? 'Officer Rejected' : 'AI Detected'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => handleAdjudicate('OFFICER_VERIFIED')}
                        disabled={isSavingAdjudication}
                        className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                          activeRule.officerVerificationStatus === 'OFFICER_VERIFIED'
                            ? 'bg-rose-600 text-white ring-2 ring-rose-600/40'
                            : 'bg-black/5 dark:bg-white/5 hover:bg-rose-600 hover:text-white text-rose-600 border border-rose-500/40'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        Accept as Legal Violation
                      </button>

                      <button
                        onClick={() => handleAdjudicate('OFFICER_REJECTED')}
                        disabled={isSavingAdjudication}
                        className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                          activeRule.officerVerificationStatus === 'OFFICER_REJECTED'
                            ? 'bg-zinc-700 text-white ring-2 ring-zinc-500/40'
                            : 'bg-black/5 dark:bg-white/5 hover:bg-zinc-700 hover:text-white text-muted-foreground border border-border/60'
                        }`}
                      >
                        <X className="w-3.5 h-3.5" />
                        Reject / Dismiss Anomaly
                      </button>
                    </div>

                    {adjudicationMessage && (
                      <div className={`p-2 rounded-lg text-xs font-semibold ${
                        adjudicationMessage.type === 'success' ? 'bg-emerald-500/15 text-emerald-600' : 'bg-rose-500/15 text-rose-600'
                      }`}>
                        {adjudicationMessage.text}
                      </div>
                    )}
                  </div>

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
    </div>
  );
}
