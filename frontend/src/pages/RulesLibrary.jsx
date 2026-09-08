import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Book, ShieldAlert, Search, Building2, MapPin, ExternalLink, Scale, Tag, Calendar, Filter, GitBranch } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../lib/utils';

export default function RulesLibrary() {
  const [rules, setRules] = useState([]);
  const [states, setStates] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [jurisdictionFilter, setJurisdictionFilter] = useState('ALL'); // 'ALL' | 'Central' | 'State'
  const [selectedState, setSelectedState] = useState('ALL'); // 'ALL' or specific state
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [rulesRes, statesRes] = await Promise.allSettled([
          axios.get(`${API_URL}/api/rules`),
          axios.get(`${API_URL}/api/rules/states`)
        ]);

        if (rulesRes.status === 'fulfilled') {
          setRules(rulesRes.value.data);
        }
        if (statesRes.status === 'fulfilled' && Array.isArray(statesRes.value.data)) {
          setStates(statesRes.value.data);
        } else {
          setStates(['Telangana', 'Maharashtra', 'Karnataka', 'Tamil Nadu', 'Delhi', 'Gujarat']);
        }
      } catch (err) {
        console.error("Failed to fetch rules library data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter rules by jurisdiction, state, and search term
  const filteredRules = rules.filter(r => {
    // Jurisdiction filter
    if (jurisdictionFilter === 'Central' && r.jurisdiction !== 'Central') return false;
    if (jurisdictionFilter === 'State' && r.jurisdiction !== 'State') return false;

    // State filter (if State tab or ALL is selected and a specific state is chosen)
    if (selectedState !== 'ALL' && r.jurisdiction === 'State' && r.stateName !== selectedState) {
      return false;
    }

    // Search filter
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (r.ruleName && r.ruleName.toLowerCase().includes(term)) ||
      (r.requirement && r.requirement.toLowerCase().includes(term)) ||
      (r.ruleNumber && r.ruleNumber.toLowerCase().includes(term)) ||
      (r.ruleId && r.ruleId.toLowerCase().includes(term)) ||
      (r.stateName && r.stateName.toLowerCase().includes(term)) ||
      (r.productCategory && r.productCategory.toLowerCase().includes(term))
    );
  });

  const centralCount = rules.filter(r => r.jurisdiction === 'Central').length;
  const stateCount = rules.filter(r => r.jurisdiction === 'State').length;

  return (
    <div className="p-8 max-w-6xl mx-auto h-full flex flex-col relative transition-colors duration-500">
      <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-primary/20 blur-[100px] rounded-full pointer-events-none"></div>
      
      <div className="mb-6 relative z-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-foreground tracking-tight flex items-center gap-3">
              <Scale className="w-9 h-9 text-primary" />
              Statutory Rules Library
            </h1>
            <p className="text-muted-foreground mt-2 text-base">
              Repository of Central Government & State-specific Legal Metrology enforcement mandates.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Link
              to="/rules/history"
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-primary/15 hover:bg-primary/25 border border-primary/30 text-xs font-bold text-primary transition-all shadow-sm"
            >
              <GitBranch className="w-4 h-4" />
              Rule Version Control & Ledger
            </Link>

            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-black/5 dark:bg-white/5 border border-border/50 text-xs font-semibold text-muted-foreground">
              <span>Total Active Rules:</span>
              <span className="font-bold text-foreground bg-primary/20 text-primary px-2.5 py-0.5 rounded-full">
                {rules.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Jurisdiction & State Filter Bar */}
      <div className="mb-6 space-y-3 relative z-10">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => { setJurisdictionFilter('ALL'); setSelectedState('ALL'); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              jurisdictionFilter === 'ALL'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'bg-black/5 dark:bg-white/5 text-muted-foreground hover:text-foreground border border-border/50'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            All Jurisdictions ({rules.length})
          </button>
          
          <button
            onClick={() => setJurisdictionFilter('Central')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              jurisdictionFilter === 'Central'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-black/5 dark:bg-white/5 text-muted-foreground hover:text-foreground border border-border/50'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Central Government ({centralCount})
          </button>
          
          <button
            onClick={() => setJurisdictionFilter('State')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              jurisdictionFilter === 'State'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-black/5 dark:bg-white/5 text-muted-foreground hover:text-foreground border border-border/50'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            State Enforcement ({stateCount})
          </button>
        </div>

        {/* State filter selector when viewing States */}
        {(jurisdictionFilter === 'State' || jurisdictionFilter === 'ALL') && (
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <MapPin className="w-3 h-3 text-purple-500" /> Filter State:
            </span>
            <button
              onClick={() => setSelectedState('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                selectedState === 'ALL'
                  ? 'bg-purple-500/20 text-purple-700 dark:text-purple-300 font-bold border border-purple-500/40'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All States
            </button>
            {states.map(state => (
              <button
                key={state}
                onClick={() => setSelectedState(state)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  selectedState === state
                    ? 'bg-purple-600 text-white font-bold shadow-sm'
                    : 'bg-black/5 dark:bg-white/5 text-muted-foreground hover:text-foreground border border-border/50'
                }`}
              >
                {state}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Search Input */}
      <div className="mb-6 flex relative z-10">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-muted-foreground" />
        </div>
        <input
          type="text"
          className="block w-full pl-12 pr-4 py-3.5 border border-border/50 rounded-2xl bg-black/5 dark:bg-white/5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-inner backdrop-blur-md transition-all placeholder:text-muted-foreground/50 text-sm"
          placeholder="Search rules by section, title, requirement, category, or state..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Rules List */}
      <div className="flex-1 overflow-y-auto space-y-4 relative z-10 pr-2 pb-8">
        {loading ? (
          <div className="text-center py-20 text-muted-foreground">Loading statutory rules...</div>
        ) : filteredRules.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground font-medium text-lg glass rounded-3xl p-8 border border-border/50">
            No rules match the selected filters or search query.
          </div>
        ) : (
          filteredRules.map((rule, idx) => {
            const isState = rule.jurisdiction === 'State';
            return (
              <div 
                key={rule.ruleId || idx} 
                className={`glass rounded-3xl p-6 transition-all duration-300 hover-lift border shadow-md ${
                  isState
                    ? 'border-border/50 border-l-4 border-l-purple-500 hover:border-l-purple-600'
                    : 'border-border/50 border-l-4 border-l-blue-500 hover:border-l-blue-600'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-2xl transition-colors shadow-inner shrink-0 ${
                      isState ? 'bg-purple-500/10 text-purple-600' : 'bg-blue-500/10 text-blue-600'
                    }`}>
                      {isState ? <MapPin className="w-5 h-5" /> : <Book className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/5 border border-border/50 text-foreground/80">
                          {rule.ruleNumber || rule.ruleId}
                        </span>

                        {isState ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                            <MapPin className="w-3 h-3" /> State: {rule.stateName}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                            <Building2 className="w-3 h-3" /> Central Government
                          </span>
                        )}

                        {rule.productCategory && rule.productCategory !== 'All' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                            <Tag className="w-3 h-3" /> {rule.productCategory}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-foreground tracking-tight">{rule.ruleName}</h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                      rule.severity === 'HIGH'
                        ? 'bg-rose-500/15 text-rose-600 border border-rose-500/30'
                        : 'bg-amber-500/15 text-amber-600 border border-amber-500/30'
                    }`}>
                      {rule.severity || 'HIGH'}
                    </span>
                    <div className="px-3 py-1 rounded-full bg-black/5 dark:bg-white/5 text-foreground/70 text-xs font-bold border border-border/50 shadow-sm">
                      Weight: {rule.weight}
                    </div>
                  </div>
                </div>

                <div className="pl-0 md:pl-14">
                  <p className="text-foreground/80 leading-relaxed text-sm">
                    {rule.requirement}
                  </p>

                  <div className="mt-4 pt-3 border-t border-border/40 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="flex items-center gap-1.5 font-semibold text-foreground/70">
                        <ShieldAlert className="w-3.5 h-3.5 text-primary" />
                        {rule.sourceDocument || 'Legal Metrology (Packaged Commodities) Rules, 2011'}
                      </span>
                      {rule.version && (
                        <span className="px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 font-mono text-[11px]">
                          v{rule.version}
                        </span>
                      )}
                      {rule.effectiveFrom && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Eff: {new Date(rule.effectiveFrom).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        to={`/rules/history/${rule.ruleId}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-all"
                      >
                        <GitBranch className="w-3 h-3" />
                        Version History
                      </Link>

                      {rule.sourceUrl && (
                        <a 
                          href={rule.sourceUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline font-semibold"
                        >
                          Official Source <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
