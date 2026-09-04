import { useState, useEffect } from 'react';
import { Book, ShieldAlert, Search } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../lib/utils';

export default function RulesLibrary() {
  const [rules, setRules] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchRules = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/rules`);
        setRules(res.data);
      } catch (err) {
        console.error("Failed to fetch rules", err);
      }
    };
    fetchRules();
  }, []);

  const filteredRules = rules.filter(r => 
    r.ruleName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.requirement.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-6xl mx-auto h-full flex flex-col relative transition-colors duration-500">
      <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-primary/20 blur-[100px] rounded-full pointer-events-none"></div>
      
      <div className="mb-8 relative z-10">
        <h1 className="text-4xl font-black text-foreground tracking-tight">Rules Library</h1>
        <p className="text-muted-foreground mt-2 text-lg">Reference of all active compliance rules evaluated by PackSure AI.</p>
      </div>

      <div className="mb-8 flex relative z-10">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-muted-foreground" />
        </div>
        <input
          type="text"
          className="block w-full pl-12 pr-4 py-4 border border-border/50 rounded-2xl bg-black/5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-inner backdrop-blur-md transition-all placeholder:text-muted-foreground/50"
          placeholder="Search rules by name or requirement..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-y-auto space-y-5 relative z-10 pr-2">
        {filteredRules.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground font-medium text-lg">No rules match your search.</div>
        ) : (
          filteredRules.map((rule, idx) => (
            <div key={idx} className="glass rounded-3xl p-8 transition-all duration-300 hover-lift group border border-border/50 border-l-4 border-l-primary/50 hover:border-l-primary shadow-md">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="p-3 bg-primary/10 rounded-2xl mr-5 group-hover:bg-primary/20 transition-colors shadow-inner">
                    <Book className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground tracking-wide">{rule.ruleName}</h3>
                    <span className="text-sm font-mono text-primary/70">{rule.ruleId}</span>
                  </div>
                </div>
                <div className="px-4 py-1.5 rounded-full bg-black/5 text-foreground/70 text-sm font-bold border border-border/50 shadow-sm">
                  Weight: {rule.weight}
                </div>
              </div>
              <div className="pl-16">
                <p className="text-foreground/80 leading-relaxed text-[15px]">
                  {rule.requirement}
                </p>
                <div className="mt-5 flex items-center text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  <ShieldAlert className="w-4 h-4 mr-2 text-muted-foreground/50" />
                  Legal Metrology (Packaged Commodities) Rules, 2011
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
