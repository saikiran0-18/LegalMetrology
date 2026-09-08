import { useState, useEffect } from 'react';
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
  Filter
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

  useEffect(() => {
    const fetchScan = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/history/${id}`);
        setScan(res.data);
        if (res.data.ruleResults && res.data.ruleResults.length > 0) {
          setActiveRule(res.data.ruleResults[0]);
        }
      } catch (error) {
        console.error("Failed to load scan", error);
      } finally {
        setLoading(false);
      }
    };
    fetchScan();
  }, [id]);

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

  const failures = scan.ruleResults.filter(r => r.status === 'FAIL').length;
  const warnings = scan.ruleResults.filter(r => r.status === 'WARNING').length;
  const passed = scan.ruleResults.filter(r => r.status === 'PASS').length;

  const centralCount = scan.ruleResults.filter(r => r.jurisdiction === 'Central').length;
  const stateCount = scan.ruleResults.filter(r => r.jurisdiction === 'State').length;

  const displayedRules = scan.ruleResults.filter(r => {
    if (selectedJurisdiction === 'ALL') return true;
    return r.jurisdiction === selectedJurisdiction;
  });

  const handleDownloadReport = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(20, 30, 70);
    doc.text("PACKSURE AI - LEGAL METROLOGY COMPLIANCE REPORT", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Scan ID: ${scan._id}`, 14, 28);
    doc.text(`Inspection Date: ${new Date(scan.inspectionDate || scan.timestamp).toLocaleString()}`, 14, 34);
    doc.text(`Inspection State: ${scan.inspectionState || 'Central (All India)'}`, 14, 40);
    doc.text(`Product Category: ${scan.productCategory || 'General Packaged Commodity'}`, 14, 46);
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
    doc.text(`COMPLIANCE SCORE: ${scan.score}%  |  RISK LEVEL: ${scan.riskLevel}  |  PASSED: ${passed}  |  WARNINGS: ${warnings}  |  VIOLATIONS: ${failures}`, 18, 67);

    // Section 1: Extracted Information
    doc.setFontSize(12);
    doc.setTextColor(30);
    doc.text("1. Mandatory Declarations Detected", 14, 82);

    const infoRows = Object.entries(scan.extractedInfo || {}).map(([key, val]) => [
      key.replace(/([A-Z])/g, ' $1').trim().toUpperCase(),
      String(val)
    ]);

    autoTable(doc, {
      startY: 86,
      head: [["Declaration Field", "Detected Label Value"]],
      body: infoRows,
      theme: "striped",
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [40, 50, 90] }
    });

    // Section 2: Rule Evaluations
    doc.addPage();
    doc.setFontSize(12);
    doc.text("2. Statutory Rule Evaluation (Central & State Enforcement)", 14, 20);

    const ruleRows = scan.ruleResults.map(r => [
      r.ruleNumber || r.ruleId,
      r.ruleName,
      `${r.jurisdiction}${r.stateName ? ` (${r.stateName})` : ''}`,
      r.status,
      r.detectedValue || '-',
      r.explanation,
      r.recommendation || '-'
    ]);

    autoTable(doc, {
      startY: 25,
      head: [["Rule", "Title", "Jurisdiction", "Status", "Detected", "Audit Findings", "Recommendation"]],
      body: ruleRows,
      theme: "grid",
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [40, 50, 90] },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 32 },
        2: { cellWidth: 22 },
        3: { cellWidth: 15 },
        4: { cellWidth: 22 },
        5: { cellWidth: 42 },
        6: { cellWidth: 35 }
      }
    });

    doc.save(`PackSure_Compliance_${scan.inspectionState || 'India'}_${scan._id.substring(0, 8)}.pdf`);
  };

  const handleExportCSV = () => {
    const rows = [
      ['PACKSURE AI - LEGAL METROLOGY AUDIT REPORT'],
      ['Scan ID', scan._id],
      ['Inspection Date', new Date(scan.inspectionDate || scan.timestamp).toLocaleString()],
      ['Inspection State', scan.inspectionState || 'Central (All India)'],
      ['Product Category', scan.productCategory || 'General Packaged Commodity'],
      ['Inspector Officer', scan.inspectorName || 'Officer'],
      ['Compliance Score', `${scan.score}%`],
      ['Risk Level', scan.riskLevel],
      ['Passed Count', passed],
      ['Warning Count', warnings],
      ['Violation Count', failures],
      [''],
      ['--- MANDATORY STATUTORY DECLARATIONS ---'],
      ['Field', 'Detected Value']
    ];

    Object.entries(scan.extractedInfo || {}).forEach(([k, v]) => {
      rows.push([k.replace(/([A-Z])/g, ' $1').trim().toUpperCase(), `"${String(v || '').replace(/"/g, '""')}"`]);
    });

    rows.push(['']);
    rows.push(['--- CENTRAL & STATE RULE EVALUATIONS ---']);
    rows.push(['Rule ID', 'Rule Section', 'Rule Title', 'Jurisdiction', 'State', 'Status', 'Severity', 'Source Document', 'Detected Value', 'Explanation', 'Recommendation']);

    (scan.ruleResults || []).forEach(r => {
      rows.push([
        r.ruleId || '',
        `"${(r.ruleNumber || '').replace(/"/g, '""')}"`,
        `"${(r.ruleName || '').replace(/"/g, '""')}"`,
        r.jurisdiction || 'Central',
        r.stateName || 'Central',
        r.status || '',
        r.severity || '',
        `"${(r.sourceDocument || '').replace(/"/g, '""')}"`,
        `"${(r.detectedValue || '').replace(/"/g, '""')}"`,
        `"${(r.explanation || '').replace(/"/g, '""')}"`,
        `"${(r.recommendation || '').replace(/"/g, '""')}"`
      ]);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PackSure_${scan.inspectionState || 'India'}_${scan._id.substring(0, 8)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto transition-colors duration-500">
      {/* Top Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div className="flex items-center">
          <Link to="/" className="p-2 mr-4 rounded-full bg-secondary/50 hover:bg-secondary transition-colors text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Compliance Results</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-muted-foreground text-xs font-mono">Scan ID: {scan._id}</span>
              <span className="text-muted-foreground text-xs">•</span>
              <span className="text-xs text-muted-foreground flex items-center gap-1 font-semibold">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                {scan.inspectionState || 'Central (All India)'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportCSV} 
            className="flex items-center text-sm bg-card hover:bg-secondary border border-border px-3.5 py-2 rounded-xl font-medium transition-colors shadow-sm text-foreground"
          >
            <FileText className="w-4 h-4 mr-2 text-primary" />
            Export CSV (Editable)
          </button>
          <button 
            onClick={handleDownloadReport} 
            className="flex items-center text-sm bg-primary text-primary-foreground px-4 py-2 rounded-xl font-semibold hover:bg-primary/90 transition-colors shadow-md shadow-primary/20"
          >
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        
        {/* Left Column: Image & Extracted Text */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass dark:glass-dark bg-card/80 dark:bg-card/30 rounded-3xl p-4 flex justify-center bg-black/5 dark:bg-black/40 border border-border/50 shadow-xl">
            <img 
              src={`${API_URL}/${scan.imagePath}`} 
              alt="Scanned Product" 
              className="max-h-80 object-contain rounded-xl shadow-2xl ring-1 ring-border/50"
              onError={(e) => { e.target.src = 'https://via.placeholder.com/300'; }}
            />
          </div>

          <div className="glass dark:glass-dark bg-card/80 dark:bg-card/30 rounded-3xl overflow-hidden shadow-xl border border-border/50">
            <div className="px-6 py-4 border-b border-border/50 bg-black/5 dark:bg-white/5 flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 bg-primary/10 dark:bg-primary/20 rounded-lg mr-3 shadow-inner">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">Extracted Information</h3>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                {scan.productCategory || 'General'}
              </span>
            </div>
            <div className="p-0">
              <table className="w-full text-sm">
                <tbody>
                  {Object.entries(scan.extractedInfo || {}).map(([key, value]) => {
                    if (key === 'rawText' || key === 'prohibitedWords') return null;
                    return (
                      <tr key={key} className="border-b border-border/50 last:border-0 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <td className="px-6 py-3 font-medium text-muted-foreground capitalize w-1/3 text-xs">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </td>
                        <td className="px-6 py-3 font-medium text-foreground break-words text-xs">{String(value)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Score & Rules */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Score & Counts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass dark:glass-dark bg-card/80 dark:bg-card/30 rounded-3xl p-8 flex flex-col items-center justify-center text-center col-span-2 md:col-span-1 relative overflow-hidden group shadow-xl">
              <div className={cn("absolute inset-0 opacity-10 bg-gradient-to-b group-hover:opacity-20 transition-opacity duration-500", 
                scan.score >= 90 ? "from-emerald-500 to-transparent" : 
                scan.score >= 70 ? "from-amber-500 to-transparent" : "from-red-500 to-transparent")}></div>
              
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-2 relative z-10">Compliance Score</p>
              <div className="flex items-baseline justify-center relative z-10">
                <span className={cn("text-6xl font-black tracking-tight", 
                  scan.score >= 90 ? "text-emerald-600 dark:text-emerald-400" : 
                  scan.score >= 70 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400")}>
                  {scan.score}%
                </span>
              </div>
              
              <div className="mt-4 flex flex-col items-center gap-1.5 relative z-10">
                <span className={cn("px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm border", 
                  scan.riskLevel === 'LOW' ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30" : 
                  scan.riskLevel === 'MEDIUM' ? "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30" : 
                  "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30")}>
                  {scan.riskLevel} Risk Level
                </span>

                <span className="text-[11px] font-semibold text-muted-foreground mt-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-primary" /> {scan.inspectionState || 'Central'}
                </span>
              </div>
            </div>

            <div className="glass dark:glass-dark bg-card/80 dark:bg-card/30 rounded-3xl p-6 grid grid-cols-3 gap-2 col-span-2 shadow-xl border border-border/50">
               <div className="flex flex-col items-center justify-center border-r border-border/50 relative z-10 group">
                 <div className="p-3 bg-emerald-100 dark:bg-emerald-500/10 rounded-2xl mb-3 group-hover:scale-110 transition-transform duration-300">
                   <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                 </div>
                 <span className="text-3xl font-black text-foreground">{passed}</span>
                 <span className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1">Passed</span>
               </div>
               <div className="flex flex-col items-center justify-center border-r border-border/50 relative z-10 group">
                 <div className="p-3 bg-amber-100 dark:bg-amber-500/10 rounded-2xl mb-3 group-hover:scale-110 transition-transform duration-300">
                   <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                 </div>
                 <span className="text-3xl font-black text-foreground">{warnings}</span>
                 <span className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1">Warnings</span>
               </div>
               <div className="flex flex-col items-center justify-center relative z-10 group">
                 <div className="p-3 bg-red-100 dark:bg-red-500/10 rounded-2xl mb-3 group-hover:scale-110 transition-transform duration-300">
                   <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                 </div>
                 <span className="text-3xl font-black text-foreground">{failures}</span>
                 <span className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1">Violations</span>
               </div>
            </div>
          </div>
          
          {/* Rules Evaluated Panel with Jurisdiction Tabs */}
          <div className="glass dark:glass-dark bg-card/80 dark:bg-card/30 rounded-3xl border border-border/50 shadow-2xl overflow-hidden flex flex-col md:flex-row h-[550px]">
             
             {/* Left Sub-column: Rule List with Jurisdiction Tabs */}
             <div className="w-full md:w-5/12 border-b md:border-b-0 md:border-r border-border/50 overflow-y-auto bg-black/5 dark:bg-black/20 flex flex-col">
                <div className="p-4 bg-black/5 dark:bg-white/5 border-b border-border/50 sticky top-0 z-10 backdrop-blur-md">
                  <div className="font-bold text-foreground uppercase tracking-wider text-xs mb-3 flex items-center justify-between">
                    <span>Rules Evaluated ({scan.ruleResults.length})</span>
                    <span className="text-[10px] text-muted-foreground font-semibold">
                      Central: {centralCount} | State: {stateCount}
                    </span>
                  </div>

                  {/* Jurisdiction Filter Tabs */}
                  <div className="flex items-center gap-1 bg-black/10 dark:bg-white/10 p-1 rounded-xl">
                    <button
                      onClick={() => setSelectedJurisdiction('ALL')}
                      className={cn(
                        "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all",
                        selectedJurisdiction === 'ALL'
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      All ({scan.ruleResults.length})
                    </button>
                    <button
                      onClick={() => setSelectedJurisdiction('Central')}
                      className={cn(
                        "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1",
                        selectedJurisdiction === 'Central'
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Landmark className="w-3 h-3 text-primary" /> Central ({centralCount})
                    </button>
                    {stateCount > 0 && (
                      <button
                        onClick={() => setSelectedJurisdiction('State')}
                        className={cn(
                          "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1",
                          selectedJurisdiction === 'State'
                            ? "bg-card text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <MapPin className="w-3 h-3 text-purple-500" /> State ({stateCount})
                      </button>
                    )}
                  </div>
                </div>

                <div className="divide-y divide-border/50 flex-1 overflow-y-auto">
                  {displayedRules.map((rule) => (
                    <div 
                      key={rule.ruleId} 
                      onClick={() => setActiveRule(rule)}
                      className={cn(
                        "p-4 cursor-pointer transition-all duration-300 flex items-start group",
                        activeRule?.ruleId === rule.ruleId ? "bg-primary/10 dark:bg-primary/20 border-l-4 border-primary" : "border-l-4 border-transparent hover:bg-black/5 dark:hover:bg-white/5"
                      )}
                    >
                      {rule.status === 'PASS' ? <CheckCircle2 className={cn("w-5 h-5 mr-3 flex-shrink-0 mt-0.5", activeRule?.ruleId === rule.ruleId ? "text-emerald-600 dark:text-emerald-400" : "text-emerald-600/60 dark:text-emerald-500/60")} /> :
                       rule.status === 'WARNING' ? <AlertTriangle className={cn("w-5 h-5 mr-3 flex-shrink-0 mt-0.5", activeRule?.ruleId === rule.ruleId ? "text-amber-600 dark:text-amber-400" : "text-amber-600/60 dark:text-amber-500/60")} /> :
                       rule.status === 'NOT_APPLICABLE' ? <ShieldCheck className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5 text-muted-foreground" /> :
                       <XCircle className={cn("w-5 h-5 mr-3 flex-shrink-0 mt-0.5", activeRule?.ruleId === rule.ruleId ? "text-red-600 dark:text-red-400" : "text-red-600/60 dark:text-red-500/60")} />}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={cn(
                            "px-1.5 py-0.2 rounded text-[10px] font-bold uppercase",
                            rule.jurisdiction === 'State' 
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800" 
                              : "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                          )}>
                            {rule.jurisdiction === 'State' ? (rule.stateName || 'State') : 'Central'}
                          </span>
                          <span className="text-[11px] font-mono text-muted-foreground font-semibold truncate">
                            {rule.ruleNumber || rule.ruleId}
                          </span>
                        </div>
                        <h4 className={cn("text-xs font-bold leading-tight line-clamp-1", activeRule?.ruleId === rule.ruleId ? "text-foreground" : "text-foreground/80")}>
                          {rule.ruleName}
                        </h4>
                        <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{rule.explanation}</p>
                      </div>
                    </div>
                  ))}
                </div>
             </div>
             
             {/* Right Sub-column: Detailed Rule View */}
             <div className="w-full md:w-7/12 p-7 overflow-y-auto bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent">
                {activeRule ? (
                  <div className="animate-in fade-in slide-in-from-right-8 duration-300 space-y-6">
                    {/* Header */}
                    <div className="flex items-start pb-5 border-b border-border/50">
                      {activeRule.status === 'PASS' ? <CheckCircle2 className="w-8 h-8 text-emerald-500 mr-3 flex-shrink-0" /> :
                       activeRule.status === 'WARNING' ? <AlertTriangle className="w-8 h-8 text-amber-500 mr-3 flex-shrink-0" /> :
                       activeRule.status === 'NOT_APPLICABLE' ? <ShieldCheck className="w-8 h-8 text-muted-foreground mr-3 flex-shrink-0" /> :
                       <XCircle className="w-8 h-8 text-red-500 mr-3 flex-shrink-0" />}
                      <div>
                        <h2 className="text-xl font-black text-foreground leading-tight">{activeRule.ruleName}</h2>
                        <div className="flex flex-wrap items-center text-xs mt-2 gap-2">
                          <span className={cn(
                            "px-2.5 py-0.5 rounded-full font-bold shadow-sm border text-[11px]",
                            activeRule.status === 'PASS' ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30" :
                            activeRule.status === 'WARNING' ? "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30" : 
                            activeRule.status === 'NOT_APPLICABLE' ? "bg-muted text-muted-foreground border-border" :
                            "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30"
                          )}>
                            {activeRule.status}
                          </span>

                          <span className={cn(
                            "px-2.5 py-0.5 rounded-full font-bold border text-[11px] flex items-center gap-1",
                            activeRule.jurisdiction === 'State' 
                              ? "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800"
                              : "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800"
                          )}>
                            {activeRule.jurisdiction === 'State' ? <MapPin className="w-3 h-3" /> : <Landmark className="w-3 h-3" />}
                            {activeRule.jurisdiction} {activeRule.stateName ? `(${activeRule.stateName})` : ''}
                          </span>

                          <span className="text-muted-foreground font-mono text-[11px]">{activeRule.ruleId}</span>
                        </div>
                      </div>
                    </div>

                    {/* Statutory Provenance Box */}
                    <div className="p-4 rounded-2xl bg-black/5 dark:bg-black/30 border border-border/60 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground font-bold uppercase tracking-wider text-[10px]">Source Document</span>
                        {activeRule.sourceUrl && (
                          <a 
                            href={activeRule.sourceUrl} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-primary hover:underline inline-flex items-center gap-1 font-semibold text-[11px]"
                          >
                            Official Gazette Link <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      <div className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-primary" /> {activeRule.sourceDocument}
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-4 pt-1 border-t border-border/40">
                        <span>Rule Section: <strong>{activeRule.ruleNumber || 'N/A'}</strong></span>
                        <span>Version: <strong>{activeRule.version || '2011.1'}</strong></span>
                      </div>
                    </div>

                    {/* Legal Requirement */}
                    <div>
                      <h4 className="text-xs font-bold text-primary uppercase tracking-widest mb-2 flex items-center">
                        <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                        Legal Requirement
                      </h4>
                      <div className="p-4 bg-black/5 dark:bg-black/40 rounded-2xl border border-border/50 text-xs leading-relaxed text-foreground shadow-inner">
                        {activeRule.requirement}
                      </div>
                    </div>

                    {/* Detected Value */}
                    <div>
                      <h4 className="text-xs font-bold text-primary uppercase tracking-widest mb-2 flex items-center">
                        <Scan className="w-3.5 h-3.5 mr-1.5" />
                        Detected Label Value
                      </h4>
                      <div className="font-medium text-sm border-l-4 border-primary pl-4 py-2 text-foreground bg-gradient-to-r from-primary/10 to-transparent rounded-r-xl">
                        {activeRule.detectedValue || 'Not detected'}
                      </div>
                    </div>

                    {/* Explanation */}
                    <div>
                      <h4 className="text-xs font-bold text-primary uppercase tracking-widest mb-1.5">Audit Finding & Explanation</h4>
                      <p className="text-xs text-foreground/80 leading-relaxed">{activeRule.explanation}</p>
                    </div>

                    {/* Recommendation if not PASS */}
                    {activeRule.status !== 'PASS' && activeRule.recommendation && (
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-500/10 dark:to-amber-500/5 border border-amber-200 dark:border-amber-500/20 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 dark:bg-amber-400"></div>
                        <h4 className="text-xs font-black text-amber-700 dark:text-amber-400 mb-1 flex items-center">
                          <AlertTriangle className="w-4 h-4 mr-1.5" />
                          Corrective Recommendation
                        </h4>
                        <p className="text-xs text-amber-900 dark:text-amber-200/90 leading-relaxed pl-5.5">{activeRule.recommendation}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground font-medium text-sm">
                    Select a rule from the left to view details
                  </div>
                )}
             </div>

          </div>

        </div>
      </div>

      {/* Raw OCR Text Report */}
      <div className="mt-8">
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-muted/10 flex items-center justify-between">
            <div className="flex items-center">
              <FileText className="w-4 h-4 mr-2 text-primary" />
              <h3 className="font-semibold text-foreground text-sm">Raw OCR Extraction Report</h3>
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              {scan.extractedText ? `${scan.extractedText.length} characters` : '0 characters'}
            </span>
          </div>
          <div className="p-6 bg-muted/5 font-mono text-xs text-foreground whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
            {scan.extractedText || "No raw text recorded."}
          </div>
        </div>
      </div>

    </div>
  );
}
