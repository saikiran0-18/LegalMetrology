import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, AlertTriangle, XCircle, TrendingUp, Package, ChevronRight, Scan, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import axios from 'axios';
import { API_URL, getImageUrl } from '../lib/utils';

export default function Dashboard() {
  const [history, setHistory] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [stats, setStats] = useState({
    totalScans: 0,
    complianceScore: 0,
    violations: 0,
    highRisk: 0,
    trend: 0
  });

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/history`);
        const data = res.data;
        setHistory(data.slice(0, 5)); // Last 5 scans
        
        // Generate last 7 days for the chart
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          last7Days.push({
            date: d,
            name: d.toLocaleDateString('en-US', { weekday: 'short' }),
            totalScore: 0,
            count: 0
          });
        }

        let totalScans = 0;
        let totalScore = 0;
        let violations = 0;
        let highRisk = 0;

        data.forEach(scan => {
          totalScans++;
          totalScore += scan.score;
          
          if (scan.riskLevel === 'HIGH') highRisk++;
          scan.ruleResults.forEach(r => {
            if (r.status === 'FAIL') violations++;
          });

          // Match scan to chart day
          const scanDate = new Date(scan.timestamp);
          const dayMatch = last7Days.find(d => 
            d.date.getDate() === scanDate.getDate() &&
            d.date.getMonth() === scanDate.getMonth() &&
            d.date.getFullYear() === scanDate.getFullYear()
          );
          if (dayMatch) {
            dayMatch.totalScore += scan.score;
            dayMatch.count += 1;
          }
        });

        const finalChartData = last7Days.map(d => ({
          name: d.name,
          score: d.count > 0 ? Math.round(d.totalScore / d.count) : 0
        }));
        
        setChartData(finalChartData);

        const now = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(now.getDate() - 14);

        let currentScoreSum = 0;
        let currentCount = 0;
        let prevScoreSum = 0;
        let prevCount = 0;

        data.forEach(scan => {
          const scanDate = new Date(scan.timestamp);
          if (scanDate >= sevenDaysAgo && scanDate <= now) {
            currentScoreSum += scan.score;
            currentCount++;
          } else if (scanDate >= fourteenDaysAgo && scanDate < sevenDaysAgo) {
            prevScoreSum += scan.score;
            prevCount++;
          }
        });

        const currentAvg = currentCount > 0 ? currentScoreSum / currentCount : 0;
        const prevAvg = prevCount > 0 ? prevScoreSum / prevCount : 0;
        
        let calculatedTrend = 0;
        if (prevAvg > 0) {
          calculatedTrend = ((currentAvg - prevAvg) / prevAvg) * 100;
        } else if (currentAvg > 0) {
          calculatedTrend = 100;
        }

        if (data.length > 0) {
          const avgScore = Math.round(totalScore / totalScans);
          setStats({
            totalScans,
            complianceScore: avgScore,
            violations,
            highRisk,
            trend: calculatedTrend
          });
        } else {
          setStats({
            totalScans: 0,
            complianceScore: 0,
            violations: 0,
            highRisk: 0,
            trend: 0
          });
        }
      } catch (err) {
        console.error("Failed to fetch history", err);
      }
    };
    fetchHistory();
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col relative transition-colors duration-500">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="mb-8 relative z-10 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-foreground tracking-tight">Dashboard Overview</h1>
          <p className="text-muted-foreground mt-2 text-lg">AI-powered compliance metrics for Legal Metrology Rules, 2011</p>
        </div>
        <Link 
          to="/scan" 
          className="bg-primary text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all hover:-translate-y-1 flex items-center"
        >
          <Scan className="w-5 h-5 mr-3 text-white" />
          Start AI Scan
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 relative z-10">
        <div className="glass bg-card/80 rounded-3xl p-6 border-t-4 border-t-emerald-500 shadow-xl group hover-lift relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Avg Score</p>
              <h3 className="text-3xl font-black text-foreground">{stats.complianceScore}%</h3>
            </div>
            <div className="p-3 bg-emerald-100 rounded-2xl group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-7 h-7 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="glass bg-card/80 rounded-3xl p-6 border-t-4 border-t-primary shadow-xl group hover-lift relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Total Scans</p>
              <h3 className="text-3xl font-black text-foreground">{stats.totalScans}</h3>
            </div>
            <div className="p-3 bg-primary/10 rounded-2xl group-hover:scale-110 transition-transform">
              <Package className="w-7 h-7 text-primary" />
            </div>
          </div>
        </div>

        <div className="glass bg-card/80 rounded-3xl p-6 border-t-4 border-t-amber-500 shadow-xl group hover-lift relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Violations</p>
              <h3 className="text-3xl font-black text-foreground">{stats.violations}</h3>
            </div>
            <div className="p-3 bg-amber-100 rounded-2xl group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-7 h-7 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="glass bg-card/80 rounded-3xl p-6 border-t-4 border-t-red-500 shadow-xl group hover-lift relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">High Risk</p>
              <h3 className="text-3xl font-black text-foreground">{stats.highRisk}</h3>
            </div>
            <div className="p-3 bg-red-100 rounded-2xl group-hover:scale-110 transition-transform">
              <XCircle className="w-7 h-7 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        <div className="lg:col-span-2 glass bg-card/80 rounded-3xl border border-border/50 shadow-2xl p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-foreground">Compliance Trend</h2>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8b8b8b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8b8b8b' }} />
                <Tooltip 
                  cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                  contentStyle={{ borderRadius: '16px', border: '1px solid var(--color-border)', background: 'var(--color-card)', color: 'var(--color-foreground)', backdropFilter: 'blur(10px)' }}
                />
                <Bar dataKey="score" radius={[8, 8, 0, 0]} barSize={40}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.score >= 90 ? '#818cf8' : entry.score >= 80 ? '#6366f1' : '#4f46e5'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass bg-card/80 rounded-3xl border border-border/50 shadow-2xl flex flex-col overflow-hidden">
          <div className="px-8 py-6 border-b border-border/50 flex items-center justify-between bg-card">
            <h2 className="text-xl font-bold text-foreground flex items-center">
              <Clock className="w-5 h-5 mr-3 text-primary" />
              Recent Scans
            </h2>
          </div>
          
          <div className="flex-1 overflow-y-auto bg-transparent p-2">
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                 <Scan className="w-12 h-12 text-muted-foreground/30 mb-4" />
                 <p className="text-muted-foreground font-medium">No recent scans available.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {history.map((scan) => (
                  <Link to={`/results/${scan._id}`} key={scan._id} className="block group">
                    <div className="flex items-center p-4 rounded-2xl hover:bg-black/5 transition-colors border border-transparent hover:border-border/50">
                      <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center overflow-hidden mr-4 ring-1 ring-border/50">
                         <img src={getImageUrl(scan.imagePath)} alt="product" className="w-full h-full object-cover" onError={(e) => { e.target.src = 'https://via.placeholder.com/150'; }} />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <h4 className="font-bold text-foreground text-sm truncate">{scan.extractedInfo?.productName || 'Unknown Product'}</h4>
                        <div className="flex items-center mt-1.5">
                          <span className={`text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full border ${
                            scan.score >= 90 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                            scan.score >= 70 ? 'bg-amber-100 text-amber-700 border-amber-200' :
                            'bg-red-100 text-red-700 border-red-200'
                          }`}>
                            {scan.score}% SCORE
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
