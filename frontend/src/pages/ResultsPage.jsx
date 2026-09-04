import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, AlertTriangle, XCircle, Download, FileText, BookOpen, Scan } from 'lucide-react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { cn, API_URL } from '../lib/utils';

export default function ResultsPage() {
  const { id } = useParams();
  const [scan, setScan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeRule, setActiveRule] = useState(null);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/history/${id}`);
        setScan(res.data);
        if (res.data.ruleResults.length > 0) {
          setActiveRule(res.data.ruleResults[0]);
        }
      } catch (error) {
        console.error("Failed to fetch scan results", error);
      } finally {
        setLoading(false);
      }
    };
    fetchResult();
  }, [id]);

  if (loading) {
    return <div className="p-8 flex items-center justify-center h-full text-muted-foreground">Loading results...</div>;
  }

  if (!scan) {
    return <div className="p-8 text-center text-red-500">Result not found.</div>;
  }

  const passed = scan.ruleResults.filter(r => r.status === 'PASS').length;
  const warnings = scan.ruleResults.filter(r => r.status === 'WARNING').length;
  const failures = scan.ruleResults.filter(r => r.status === 'FAIL').length;

  const scoreColor = scan.score >= 90 ? 'text-green-500' : scan.score >= 70 ? 'text-amber-500' : 'text-red-500';
  const riskColor = scan.riskLevel === 'LOW' ? 'text-green-500 bg-green-50' : scan.riskLevel === 'MEDIUM' ? 'text-amber-500 bg-amber-50' : 'text-red-500 bg-red-50';

  const handleDownloadReport = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(33, 37, 41);
    doc.text('PackSure AI - Compliance Report', 14, 20);
    
    doc.setFontSize(11);
    doc.setTextColor(108, 117, 125);
    doc.text(`Scan ID: ${scan._id}`, 14, 28);
    doc.text(`Date: ${new Date(scan.timestamp).toLocaleString()}`, 14, 34);

    // Summary Score
    doc.setFontSize(14);
    doc.setTextColor(33, 37, 41);
    doc.text(`Overall Score: ${scan.score}%  |  Risk Level: ${scan.riskLevel}`, 14, 46);

    // Extracted Information Table
    doc.setFontSize(16);
    doc.text('Extracted Label Information', 14, 58);
    
    const extractedData = Object.entries(scan.extractedInfo).map(([key, val]) => [
      key.replace(/([A-Z])/g, ' $1').trim().toUpperCase(), 
      val
    ]);
    
    autoTable(doc, {
      startY: 62,
      head: [['Field', 'Detected Value']],
      body: extractedData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] }
    });

    // Rule Results Table
    const currentY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(16);
    doc.text('Compliance Evaluation', 14, currentY);

    const rulesData = scan.ruleResults.map(r => [
      r.ruleName,
      r.status,
      r.explanation
    ]);

    autoTable(doc, {
      startY: currentY + 4,
      head: [['Rule', 'Status', 'Details']],
      body: rulesData,
      theme: 'grid',
      headStyles: { fillColor: [44, 62, 80] },
      columnStyles: {
        1: { fontStyle: 'bold', textColor: [0, 0, 0] }
      },
      didParseCell: function(data) {
        if (data.section === 'body' && data.column.index === 1) {
          if (data.cell.raw === 'PASS') data.cell.styles.textColor = [40, 167, 69];
          if (data.cell.raw === 'WARNING') data.cell.styles.textColor = [255, 193, 7];
          if (data.cell.raw === 'FAIL') data.cell.styles.textColor = [220, 53, 69];
        }
      }
    });

    doc.save(`PackSure_Report_${scan._id.substring(0, 8)}.pdf`);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto transition-colors duration-500">
      <div className="mb-6 flex items-center justify-between relative z-10">
        <div className="flex items-center">
          <Link to="/" className="p-2 mr-4 rounded-full bg-secondary/50 hover:bg-secondary transition-colors text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Compliance Results</h1>
            <p className="text-muted-foreground text-sm">Scan ID: {scan._id}</p>
          </div>
        </div>
        <button onClick={handleDownloadReport} className="flex items-center text-sm bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors shadow-md">
          <Download className="w-4 h-4 mr-2" />
          Download Report
        </button>
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
            <div className="px-6 py-4 border-b border-border/50 bg-black/5 dark:bg-white/5 flex items-center">
              <div className="p-2 bg-primary/10 dark:bg-primary/20 rounded-lg mr-3 shadow-inner">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">Extracted Information</h3>
            </div>
            <div className="p-0">
              <table className="w-full text-sm">
                <tbody>
                  {Object.entries(scan.extractedInfo).map(([key, value]) => (
                    <tr key={key} className="border-b border-border/50 last:border-0 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 font-medium text-muted-foreground capitalize w-1/3">{key.replace(/([A-Z])/g, ' $1').trim()}</td>
                      <td className="px-6 py-4 font-medium text-foreground break-words">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Score & Rules */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass dark:glass-dark bg-card/80 dark:bg-card/30 rounded-3xl p-8 flex flex-col items-center justify-center text-center col-span-2 md:col-span-1 relative overflow-hidden group shadow-xl">
              <div className={cn("absolute inset-0 opacity-10 bg-gradient-to-b group-hover:opacity-20 transition-opacity duration-500", 
                scan.score >= 90 ? "from-emerald-500 to-transparent" : 
                scan.score >= 70 ? "from-amber-500 to-transparent" : "from-red-500 to-transparent")}></div>
              
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3 relative z-10">Compliance Score</p>
              
              <h2 className={cn("text-7xl font-black relative z-10 drop-shadow-2xl", 
                scan.score >= 90 ? "text-emerald-500 dark:text-emerald-400" : 
                scan.score >= 70 ? "text-amber-500 dark:text-amber-400" : "text-red-500 dark:text-red-400")}>
                {scan.score}%
              </h2>
              
              <div className={cn("mt-6 px-4 py-1.5 text-sm font-black rounded-full border shadow-[0_0_15px_rgba(0,0,0,0.1)] relative z-10", 
                scan.riskLevel === 'LOW' ? "text-emerald-700 bg-emerald-100 border-emerald-200 dark:text-emerald-400 dark:border-emerald-400/30 dark:bg-emerald-400/10" : 
                scan.riskLevel === 'MEDIUM' ? "text-amber-700 bg-amber-100 border-amber-200 dark:text-amber-400 dark:border-amber-400/30 dark:bg-amber-400/10" : "text-red-700 bg-red-100 border-red-200 dark:text-red-400 dark:border-red-400/30 dark:bg-red-400/10")}>
                {scan.riskLevel} RISK LEVEL
              </div>
            </div>
            
            <div className="glass dark:glass-dark bg-card/80 dark:bg-card/30 rounded-3xl p-6 col-span-2 grid grid-cols-3 gap-6 text-center shadow-xl relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5"></div>
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
          
          <div className="glass dark:glass-dark bg-card/80 dark:bg-card/30 rounded-3xl border border-border/50 shadow-2xl overflow-hidden flex flex-col md:flex-row h-[500px]">
             
             {/* Rule List */}
             <div className="w-full md:w-5/12 border-b md:border-b-0 md:border-r border-border/50 overflow-y-auto bg-black/5 dark:bg-black/20">
                <div className="p-5 bg-black/5 dark:bg-white/5 border-b border-border/50 font-bold text-foreground uppercase tracking-wider text-sm sticky top-0 z-10 backdrop-blur-md">Rules Evaluated</div>
                <div className="divide-y divide-border/50">
                  {scan.ruleResults.map((rule) => (
                    <div 
                      key={rule.ruleId} 
                      onClick={() => setActiveRule(rule)}
                      className={cn(
                        "p-5 cursor-pointer transition-all duration-300 flex items-start group",
                        activeRule?.ruleId === rule.ruleId ? "bg-primary/10 dark:bg-primary/20 border-l-4 border-primary" : "border-l-4 border-transparent hover:bg-black/5 dark:hover:bg-white/5"
                      )}
                    >
                      {rule.status === 'PASS' ? <CheckCircle2 className={cn("w-6 h-6 mr-4 flex-shrink-0 mt-0.5 transition-transform group-hover:scale-110", activeRule?.ruleId === rule.ruleId ? "text-emerald-600 dark:text-emerald-400" : "text-emerald-600/50 dark:text-emerald-500/50")} /> :
                       rule.status === 'WARNING' ? <AlertTriangle className={cn("w-6 h-6 mr-4 flex-shrink-0 mt-0.5 transition-transform group-hover:scale-110", activeRule?.ruleId === rule.ruleId ? "text-amber-600 dark:text-amber-400" : "text-amber-600/50 dark:text-amber-500/50")} /> :
                       <XCircle className={cn("w-6 h-6 mr-4 flex-shrink-0 mt-0.5 transition-transform group-hover:scale-110", activeRule?.ruleId === rule.ruleId ? "text-red-600 dark:text-red-400" : "text-red-600/50 dark:text-red-500/50")} />}
                      <div>
                        <h4 className={cn("text-sm font-bold mb-1", activeRule?.ruleId === rule.ruleId ? "text-foreground" : "text-foreground/70")}>{rule.ruleName}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-1">{rule.explanation}</p>
                      </div>
                    </div>
                  ))}
                </div>
             </div>
             
             {/* Rule Details */}
             <div className="w-full md:w-7/12 p-8 overflow-y-auto bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent">
                {activeRule ? (
                  <div className="animate-in fade-in slide-in-from-right-8 duration-500">
                    <div className="flex items-center mb-8 pb-6 border-b border-border/50">
                      {activeRule.status === 'PASS' ? <CheckCircle2 className="w-10 h-10 text-emerald-500 dark:text-emerald-400 mr-4 drop-shadow-sm" /> :
                       activeRule.status === 'WARNING' ? <AlertTriangle className="w-10 h-10 text-amber-500 dark:text-amber-400 mr-4 drop-shadow-sm" /> :
                       <XCircle className="w-10 h-10 text-red-500 dark:text-red-400 mr-4 drop-shadow-sm" />}
                      <div>
                        <h2 className="text-2xl font-black text-foreground leading-tight">{activeRule.ruleName}</h2>
                        <div className="flex items-center text-xs mt-2 space-x-3">
                          <span className={cn(
                            "px-3 py-1 rounded-full font-bold shadow-sm border",
                            activeRule.status === 'PASS' ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30" :
                            activeRule.status === 'WARNING' ? "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30" : 
                            "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30"
                          )}>
                            {activeRule.status}
                          </span>
                          <span className="text-muted-foreground font-mono">{activeRule.ruleId}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-8">
                      
                      <div>
                        <h4 className="text-xs font-bold text-primary uppercase tracking-widest mb-3 flex items-center">
                          <BookOpen className="w-4 h-4 mr-2" />
                          Legal Requirement
                        </h4>
                        <div className="p-5 bg-black/5 dark:bg-black/40 rounded-2xl border border-border/50 text-sm leading-relaxed text-foreground shadow-inner">
                          {activeRule.requirement}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-primary uppercase tracking-widest mb-3 flex items-center">
                          <Scan className="w-4 h-4 mr-2" />
                          Detected Value
                        </h4>
                        <div className="font-medium text-lg border-l-4 border-primary pl-5 py-2 text-foreground bg-gradient-to-r from-primary/10 to-transparent rounded-r-xl">
                          {activeRule.detectedValue}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Explanation</h4>
                        <p className="text-sm text-foreground/80 leading-relaxed">{activeRule.explanation}</p>
                      </div>

                      {activeRule.status !== 'PASS' && (
                        <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-500/10 dark:to-amber-500/5 border border-amber-200 dark:border-amber-500/20 shadow-lg relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 dark:bg-amber-400"></div>
                          <h4 className="text-sm font-black text-amber-600 dark:text-amber-400 mb-2 flex items-center">
                            <AlertTriangle className="w-5 h-5 mr-2" />
                            Corrective Recommendation
                          </h4>
                          <p className="text-sm text-amber-800 dark:text-amber-200/80 leading-relaxed pl-7">{activeRule.recommendation}</p>
                        </div>
                      )}

                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground font-medium">Select a rule from the left to view details</div>
                )}
             </div>

          </div>

        </div>
      </div>

      {/* Raw OCR Text Report */}
      <div className="mt-8">
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-muted/10 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-primary" />
            <h3 className="font-semibold text-foreground">Raw OCR Extraction Report</h3>
          </div>
          <div className="p-6 bg-muted/5 font-mono text-sm text-foreground whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
            {scan.extractedText || "No text could be extracted from this image (e.g. unsupported format or blurry text)."}
          </div>
        </div>
      </div>

    </div>
  );
}
