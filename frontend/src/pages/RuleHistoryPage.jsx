import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  GitBranch, 
  History, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  FileText, 
  ExternalLink, 
  Building2, 
  MapPin, 
  Scale, 
  Search, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  ChevronRight,
  Filter
} from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../lib/utils';

export default function RuleHistoryPage() {
  const { ruleId: paramRuleId } = useParams();
  const navigate = useNavigate();

  const [historyList, setHistoryList] = useState([]);
  const [selectedRuleId, setSelectedRuleId] = useState(paramRuleId || 'RULE-06-1-DA');
  const [selectedRuleData, setSelectedRuleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('CURRENT'); // 'CURRENT' | 'PREVIOUS' | 'FUTURE' | 'AMENDMENTS' | 'SOURCES'
  const [searchTerm, setSearchTerm] = useState('');
  const [jurisdictionFilter, setJurisdictionFilter] = useState('ALL');

  // Interactive Temporal Simulator state
  const [simDate, setSimDate] = useState('2026-09-08');
  const [simResult, setSimResult] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Fetch summary history list
  useEffect(() => {
    const fetchHistoryList = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/rules/history`);
        if (Array.isArray(res.data)) {
          setHistoryList(res.data);
          if (!paramRuleId && res.data.length > 0) {
            setSelectedRuleId(res.data[0].ruleId);
          }
        }
      } catch (err) {
        console.error('Failed to fetch rules history summary', err);
      }
    };
    fetchHistoryList();
  }, [paramRuleId]);

  // Fetch detailed rule history when selectedRuleId changes
  useEffect(() => {
    if (!selectedRuleId) return;

    const fetchDetail = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_URL}/api/rules/history/${selectedRuleId}`);
        setSelectedRuleData(res.data);
      } catch (err) {
        console.error('Failed to fetch detailed rule history', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [selectedRuleId]);

  // Run simulation on date change
  useEffect(() => {
    if (!selectedRuleData || !simDate) return;

    const checkDateResolution = () => {
      setIsSimulating(true);
      const target = new Date(simDate);

      // Find matching version in selectedRuleData.allVersions
      const all = selectedRuleData.allVersions || [];
      const match = all.find(v => {
        const effFrom = new Date(v.effectiveFrom);
        const effTo = v.effectiveTo ? new Date(v.effectiveTo) : null;
        return effFrom <= target && (!effTo || effTo >= target);
      });

      setSimResult(match || null);
      setIsSimulating(false);
    };

    checkDateResolution();
  }, [simDate, selectedRuleData]);

  const filteredRules = historyList.filter(item => {
    if (jurisdictionFilter === 'Central' && item.jurisdiction !== 'Central') return false;
    if (jurisdictionFilter === 'State' && item.jurisdiction !== 'State') return false;
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      item.ruleId.toLowerCase().includes(q) ||
      (item.ruleNumber && item.ruleNumber.toLowerCase().includes(q)) ||
      (item.title && item.title.toLowerCase().includes(q)) ||
      (item.stateName && item.stateName.toLowerCase().includes(q))
    );
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Indefinite / Ongoing';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col relative transition-colors duration-500">
      <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-primary/20 blur-[100px] rounded-full pointer-events-none"></div>

      {/* Header */}
      <div className="mb-6 relative z-10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link 
              to="/rules" 
              className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
            >
              <Scale className="w-3.5 h-3.5" /> Rules Library
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-bold text-primary">Version Control & Audit Trail</span>
          </div>
          <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
            <GitBranch className="w-8 h-8 text-primary" />
            Statutory Rule Version Control
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Immutable version history, date-based statutory enforcement, and official gazette amendments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            Audit Ledger Active (Immutable)
          </div>
        </div>
      </div>

      {/* Interactive Time-Travel Date Simulator Banner */}
      <div className="mb-6 relative z-10 glass dark:glass-dark rounded-3xl p-5 border border-primary/30 bg-gradient-to-r from-primary/5 via-purple-500/5 to-transparent shadow-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/20 text-primary">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                Temporal Inspection Simulator
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-primary/20 text-primary">
                  Time Machine
                </span>
              </h4>
              <p className="text-xs text-muted-foreground">
                Simulate how the compliance engine dynamically resolves rule versions on any historical or future inspection date.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 bg-background/80 border border-border/60 rounded-xl px-3 py-1.5 shadow-inner">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-muted-foreground">Inspection Date:</span>
              <input
                type="date"
                value={simDate}
                onChange={(e) => setSimDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer"
              />
            </div>

            {/* Quick date buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSimDate('2019-06-15')}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-black/5 dark:bg-white/5 hover:bg-primary/20 text-muted-foreground hover:text-foreground transition-all"
                title="Simulate 2019 inspection"
              >
                2019
              </button>
              <button
                onClick={() => setSimDate('2026-09-08')}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-primary text-white shadow-sm transition-all"
                title="Simulate 2026 inspection (Today)"
              >
                2026 (Now)
              </button>
              <button
                onClick={() => setSimDate('2027-02-01')}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-500/15 text-purple-600 dark:text-purple-400 hover:bg-purple-500/25 transition-all"
                title="Simulate 2027 inspection"
              >
                2027 (Future)
              </button>
            </div>
          </div>
        </div>

        {/* Simulation Output Banner */}
        {selectedRuleData && (
          <div className="mt-3 pt-3 border-t border-border/30 flex flex-wrap items-center justify-between text-xs gap-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground/80">
                Resolution for <span className="font-mono text-primary font-bold">{selectedRuleData.ruleNumber}</span> as of <span className="underline font-bold">{formatDate(simDate)}</span>:
              </span>
              {simResult ? (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold text-xs ${
                  simResult.status === 'Expired'
                    ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40'
                    : simResult.status === 'Scheduled'
                    ? 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/40'
                    : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40'
                }`}>
                  <CheckCircle2 className="w-3 h-3" />
                  Resolved Version: v{simResult.version} ({simResult.status})
                </span>
              ) : (
                <span className="text-muted-foreground italic">No statutory rule active on this date</span>
              )}
            </div>
            {simResult && (
              <span className="text-muted-foreground truncate max-w-md">
                Effective: {formatDate(simResult.effectiveFrom)} to {formatDate(simResult.effectiveTo)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main Layout: Left Rule Selector, Right Detailed Version History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 relative z-10">
        
        {/* Left Column: Rule Selector & List */}
        <div className="lg:col-span-4 flex flex-col gap-4 glass dark:glass-dark rounded-3xl p-5 border border-border/50 h-[calc(100vh-280px)] overflow-hidden">
          <div className="flex items-center justify-between pb-2 border-b border-border/40">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              Statutory Rules Ledger
            </h3>
            <span className="text-xs font-mono font-semibold text-muted-foreground">
              {filteredRules.length} rules
            </span>
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setJurisdictionFilter('ALL')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                jurisdictionFilter === 'ALL'
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-black/5 dark:bg-white/5 text-muted-foreground hover:text-foreground'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setJurisdictionFilter('Central')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                jurisdictionFilter === 'Central'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-black/5 dark:bg-white/5 text-muted-foreground hover:text-foreground'
              }`}
            >
              Central
            </button>
            <button
              onClick={() => setJurisdictionFilter('State')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                jurisdictionFilter === 'State'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-black/5 dark:bg-white/5 text-muted-foreground hover:text-foreground'
              }`}
            >
              State
            </button>
          </div>

          {/* Search box */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search rule ID or section..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-black/5 dark:bg-white/5 border border-border/50 text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/60"
            />
          </div>

          {/* Scrollable list of rules */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredRules.map((item) => {
              const isSelected = item.ruleId === selectedRuleId;
              const hasFuture = item.futureScheduledVersions && item.futureScheduledVersions.length > 0;
              const hasPrevious = item.previousVersions && item.previousVersions.length > 0;

              return (
                <button
                  key={item.ruleId}
                  onClick={() => {
                    setSelectedRuleId(item.ruleId);
                    navigate(`/rules/history/${item.ruleId}`, { replace: true });
                  }}
                  className={`w-full text-left p-3 rounded-2xl transition-all border ${
                    isSelected
                      ? 'bg-primary/10 border-primary text-foreground shadow-sm'
                      : 'bg-black/5 dark:bg-white/5 border-border/40 text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-bold text-primary">
                      {item.ruleNumber || item.ruleId}
                    </span>
                    <div className="flex items-center gap-1">
                      {item.jurisdiction === 'State' ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-600 dark:text-purple-400 font-bold">
                          {item.stateName}
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold">
                          Central
                        </span>
                      )}
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 font-mono font-bold">
                        {item.totalVersions} ver
                      </span>
                    </div>
                  </div>

                  <h5 className="text-xs font-bold text-foreground line-clamp-1">
                    {item.title}
                  </h5>

                  <div className="flex items-center gap-1.5 mt-2 text-[10px] text-muted-foreground">
                    {item.currentVersion && (
                      <span className="px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">
                        v{item.currentVersion.version} Active
                      </span>
                    )}
                    {hasFuture && (
                      <span className="px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-600 dark:text-purple-400 font-bold">
                        +{item.futureScheduledVersions.length} Scheduled
                      </span>
                    )}
                    {hasPrevious && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold">
                        +{item.previousVersions.length} Past
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Detailed Rule Version History */}
        <div className="lg:col-span-8 flex flex-col gap-4 glass dark:glass-dark rounded-3xl p-6 border border-border/50 h-[calc(100vh-280px)] overflow-hidden">
          {loading || !selectedRuleData ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              Loading rule version ledger...
            </div>
          ) : (
            <>
              {/* Rule Title Card */}
              <div className="pb-4 border-b border-border/40">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-black px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary">
                      {selectedRuleData.ruleNumber}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">
                      ID: {selectedRuleData.ruleId}
                    </span>
                    {selectedRuleData.jurisdiction === 'State' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                        <MapPin className="w-3 h-3" /> State Enforcement: {selectedRuleData.stateName}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                        <Building2 className="w-3 h-3" /> Central Government (Pan-India)
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground font-semibold">
                    Total Tracked Snapshots: <span className="text-foreground font-bold">{selectedRuleData.totalVersions}</span>
                  </div>
                </div>

                <h2 className="text-xl font-black text-foreground tracking-tight">
                  {selectedRuleData.title}
                </h2>
              </div>

              {/* Version Category Navigation Tabs */}
              <div className="flex items-center gap-2 border-b border-border/30 pb-2 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('CURRENT')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                    activeTab === 'CURRENT'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-black/5 dark:bg-white/5 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Current Active Version ({selectedRuleData.currentVersion ? `v${selectedRuleData.currentVersion.version}` : 'None'})
                </button>

                <button
                  onClick={() => setActiveTab('PREVIOUS')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                    activeTab === 'PREVIOUS'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-black/5 dark:bg-white/5 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  Previous Versions ({selectedRuleData.previousVersions?.length || 0})
                </button>

                <button
                  onClick={() => setActiveTab('FUTURE')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                    activeTab === 'FUTURE'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-black/5 dark:bg-white/5 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Future Scheduled ({selectedRuleData.futureScheduledVersions?.length || 0})
                </button>

                <button
                  onClick={() => setActiveTab('AMENDMENTS')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                    activeTab === 'AMENDMENTS'
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-black/5 dark:bg-white/5 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Amendments Timeline
                </button>

                <button
                  onClick={() => setActiveTab('SOURCES')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                    activeTab === 'SOURCES'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-black/5 dark:bg-white/5 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Source Documents
                </button>
              </div>

              {/* Tab Content Container */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-4">
                
                {/* 1. CURRENT ACTIVE VERSION TAB */}
                {activeTab === 'CURRENT' && (
                  <div>
                    {selectedRuleData.currentVersion ? (
                      <div className="glass rounded-2xl p-6 border border-emerald-500/30 bg-emerald-500/5 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500 text-white uppercase tracking-wider">
                              v{selectedRuleData.currentVersion.version} - In Force Today
                            </span>
                            <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              Status: {selectedRuleData.currentVersion.status}
                            </span>
                          </div>

                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                            <span>
                              Effective: <strong>{formatDate(selectedRuleData.currentVersion.effectiveFrom)}</strong> to <strong>{formatDate(selectedRuleData.currentVersion.effectiveTo)}</strong>
                            </span>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-bold text-foreground mb-1.5">
                            {selectedRuleData.currentVersion.title}
                          </h4>
                          <div className="p-4 rounded-xl bg-background/80 border border-border/50 text-foreground text-sm leading-relaxed">
                            {selectedRuleData.currentVersion.requirement}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
                          <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-border/40 space-y-1">
                            <div className="font-semibold text-muted-foreground">Statutory Approval Details:</div>
                            <div className="text-foreground font-bold">{selectedRuleData.currentVersion.approvedBy}</div>
                            <div className="text-muted-foreground text-[11px]">
                              Approved on: {formatDate(selectedRuleData.currentVersion.approvedDate)} ({selectedRuleData.currentVersion.approvalStatus})
                            </div>
                          </div>

                          <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-border/40 space-y-1">
                            <div className="font-semibold text-muted-foreground">Gazette Enactment Citation:</div>
                            <div className="text-foreground font-medium">{selectedRuleData.currentVersion.sourceDocument}</div>
                            {selectedRuleData.currentVersion.sourceUrl && (
                              <a
                                href={selectedRuleData.currentVersion.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-primary hover:underline text-[11px] font-semibold"
                              >
                                View Official Gazette <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>

                        {selectedRuleData.currentVersion.amendments && (
                          <div className="text-xs p-3 rounded-xl bg-primary/5 border border-primary/20 text-foreground/80">
                            <span className="font-bold text-primary">Amendment Notification: </span>
                            {selectedRuleData.currentVersion.amendments}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        No active version found currently in force.
                      </div>
                    )}
                  </div>
                )}

                {/* 2. PREVIOUS HISTORICAL VERSIONS TAB */}
                {activeTab === 'PREVIOUS' && (
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      Historical versions are permanently preserved in the ledger for prior inspections, seizure litigation, and audit integrity. Never deleted.
                    </div>

                    {selectedRuleData.previousVersions?.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground text-sm">
                        No previous historical versions archived for this rule.
                      </div>
                    ) : (
                      selectedRuleData.previousVersions.map((prev, idx) => (
                        <div key={idx} className="glass rounded-2xl p-5 border border-border/50 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40">
                                v{prev.version} (Expired / Superseded)
                              </span>
                              <span className="text-xs font-mono text-muted-foreground">
                                Enacted {formatDate(prev.effectiveFrom)}
                              </span>
                            </div>

                            <div className="text-xs font-semibold text-muted-foreground">
                              Validity Window: {formatDate(prev.effectiveFrom)} &rarr; {formatDate(prev.effectiveTo)}
                            </div>
                          </div>

                          <p className="text-sm text-foreground/90 p-3 rounded-xl bg-background/60 border border-border/40">
                            {prev.requirement}
                          </p>

                          <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground gap-2 pt-1 border-t border-border/30">
                            <span>Approved by: <strong className="text-foreground/80">{prev.approvedBy}</strong> ({formatDate(prev.approvedDate)})</span>
                            <span>{prev.sourceDocument}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* 3. FUTURE SCHEDULED VERSIONS TAB */}
                {activeTab === 'FUTURE' && (
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-700 dark:text-purple-300 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 shrink-0" />
                      Upcoming gazetted statutory amendments scheduled to take legal effect on future dates.
                    </div>

                    {selectedRuleData.futureScheduledVersions?.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground text-sm">
                        No future scheduled amendments on file for this rule.
                      </div>
                    ) : (
                      selectedRuleData.futureScheduledVersions.map((fut, idx) => (
                        <div key={idx} className="glass rounded-2xl p-5 border border-purple-500/30 bg-purple-500/5 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-600 text-white uppercase tracking-wider">
                                v{fut.version} (Scheduled for Enforcement)
                              </span>
                              <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-500/20 text-purple-700 dark:text-purple-300">
                                Effective From: {formatDate(fut.effectiveFrom)}
                              </span>
                            </div>

                            <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                              Status: {fut.status}
                            </span>
                          </div>

                          <p className="text-sm text-foreground/90 p-3 rounded-xl bg-background/80 border border-border/40">
                            {fut.requirement}
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs pt-1">
                            <div className="text-muted-foreground">
                              Approved by: <strong className="text-foreground">{fut.approvedBy}</strong>
                            </div>
                            <div className="text-muted-foreground">
                              Notification: <strong className="text-foreground">{fut.amendments}</strong>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* 4. AMENDMENTS TIMELINE TAB */}
                {activeTab === 'AMENDMENTS' && (
                  <div className="space-y-4">
                    <p className="text-xs text-muted-foreground">
                      Chronological record of statutory gazette amendments, government orders, and regulatory revisions.
                    </p>

                    <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/60">
                      {selectedRuleData.amendments?.map((amend, idx) => (
                        <div key={idx} className="relative">
                          <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-primary ring-4 ring-background"></div>
                          <div className="glass rounded-xl p-4 border border-border/50">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="font-mono text-xs font-bold text-primary">
                                Version {amend.version}
                              </span>
                              <span className="text-[11px] font-semibold text-muted-foreground">
                                Effective {formatDate(amend.effectiveFrom)}
                              </span>
                            </div>
                            <div className="text-xs font-bold text-foreground mb-1">
                              {amend.amendmentText}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              Sanctioned by {amend.approvedBy} on {formatDate(amend.approvedDate)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. SOURCE DOCUMENTS TAB */}
                {activeTab === 'SOURCES' && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Statutory source enactments and official government gazette references across all versions.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedRuleData.sourceDocuments?.map((doc, idx) => (
                        <div key={idx} className="glass rounded-2xl p-4 border border-border/50 space-y-2">
                          <div className="flex items-center gap-2 text-primary font-bold text-xs">
                            <FileText className="w-4 h-4" />
                            Official Gazette Document
                          </div>
                          <h4 className="text-sm font-bold text-foreground">
                            {doc.title}
                          </h4>
                          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/30">
                            <span className="font-mono text-[11px]">Applied in v{doc.version}</span>
                            {doc.url && (
                              <a
                                href={doc.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-primary font-semibold hover:underline"
                              >
                                View Portal <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
