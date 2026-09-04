import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Search, Trash2, ChevronRight, Eye } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../lib/utils';

export default function History() {
  const [history, setHistory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/history`);
      setHistory(res.data);
    } catch (err) {
      console.error("Failed to fetch history", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this scan record?")) {
      try {
        await axios.delete(`${API_URL}/api/history/${id}`);
        fetchHistory(); // Refresh
      } catch (error) {
        console.error("Failed to delete", error);
      }
    }
  };

  const filteredHistory = history.filter(scan => 
    scan.extractedInfo?.productName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    scan._id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col relative transition-colors duration-500">
      <div className="absolute top-[-5%] left-[20%] w-[600px] h-[600px] bg-primary/10 blur-[150px] rounded-full pointer-events-none"></div>
      
      <div className="mb-8 flex justify-between items-end relative z-10">
        <div>
          <h1 className="text-4xl font-black text-foreground tracking-tight">Scan History</h1>
          <p className="text-muted-foreground mt-2 text-lg">Review past compliance scans and generated reports.</p>
        </div>
      </div>

      <div className="mb-8 flex relative z-10">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-muted-foreground" />
        </div>
        <input
          type="text"
          className="block w-full max-w-md pl-12 pr-4 py-3 border border-border/50 rounded-2xl bg-black/5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-inner backdrop-blur-md transition-all placeholder:text-muted-foreground/50"
          placeholder="Search by product name or ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="flex-1 glass dark:glass-dark rounded-3xl border border-border/50 shadow-2xl overflow-hidden flex flex-col relative z-10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/5 border-b border-border/50 text-muted-foreground text-xs font-bold uppercase tracking-widest">
                <th className="px-8 py-5">Product / Image</th>
                <th className="px-8 py-5">Scan Date</th>
                <th className="px-8 py-5">Score</th>
                <th className="px-8 py-5">Risk Level</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-muted-foreground">Loading history...</td>
                </tr>
              ) : filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-muted-foreground">No scan records found.</td>
                </tr>
              ) : (
                filteredHistory.map((scan) => (
                  <tr key={scan._id} className="hover:bg-black/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-12 w-12 rounded bg-white border border-border flex-shrink-0 flex items-center justify-center overflow-hidden">
                          <img src={`${API_URL}/${scan.imagePath}`} alt="thumb" className="max-h-full max-w-full object-contain" onError={(e) => { e.target.src = 'https://via.placeholder.com/50'; }} />
                        </div>
                        <div className="ml-4">
                          <div className="font-medium text-foreground">{scan.extractedInfo?.productName || 'Unknown Product'}</div>
                          <div className="text-xs text-muted-foreground truncate w-48" title={scan._id}>ID: {scan._id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center text-muted-foreground">
                        <Clock className="w-4 h-4 mr-2" />
                        {new Date(scan.timestamp).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                          scan.score >= 90 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                          scan.score >= 70 ? 'bg-amber-100 text-amber-700 border-amber-200' :
                          'bg-red-100 text-red-700 border-red-200'
                      }`}>
                        {scan.score}%
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                          scan.riskLevel === 'LOW' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                          scan.riskLevel === 'MEDIUM' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                          'bg-red-100 text-red-700 border-red-200'
                      }`}>
                        {scan.riskLevel}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link 
                          to={`/results/${scan._id}`}
                          className="p-2 text-muted-foreground hover:text-primary bg-card border border-border/50 rounded-md shadow-sm hover:shadow transition-all"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button 
                          onClick={() => handleDelete(scan._id)}
                          className="p-2 text-muted-foreground hover:text-red-500 bg-card border border-border/50 rounded-md shadow-sm hover:shadow transition-all"
                          title="Delete Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
