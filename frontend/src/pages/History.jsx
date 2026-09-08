import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Clock, 
  Search, 
  Trash2, 
  Eye, 
  Shirt, 
  Utensils, 
  Sparkles, 
  Cpu, 
  Package, 
  Layers, 
  Filter,
  X
} from 'lucide-react';
import axios from 'axios';
import { API_URL, getImageUrl } from '../lib/utils';

// Helper to reliably resolve category even for older scans
const resolveCategory = (scan) => {
  if (scan.productCategory && scan.productCategory !== 'General Packaged Commodity') {
    return scan.productCategory;
  }
  const text = `${scan.extractedInfo?.productName || ''} ${scan.extractedText || ''}`.toLowerCase();
  if (/\b(t-?shirt|shirts?|pants?|trousers?|jeans|saree|garment|jacket|hoodie|socks?|footwear|shoes?|sandals?|towels?|bedsheets?|fabric|apparel|textiles?|kurti|kurta|cloth|clothes|xxl|xl|size)\b/i.test(text)) {
    return 'Apparel & Textiles';
  }
  if (/\b(rice|flour|atta|wheat|dal|oil|ghee|biscuit|cookies?|snack|chips?|namkeen|spices?|masala|tea|coffee|juice|fssai|edible|bhujiya|aloo)\b/i.test(text)) {
    return 'Food & Beverages';
  }
  if (/\b(shampoo|soap|cream|lotion|serum|perfume|deodorant|toothpaste|face\s*wash|sunscreen|conditioner|hair\s*oil|cosmetics?)\b/i.test(text)) {
    return 'Cosmetics & Personal Care';
  }
  if (/\b(mobile|phone|laptop|cables?|chargers?|battery|earphones?|headphones?|led|bulb|electronic)\b/i.test(text)) {
    return 'Electronics & Appliances';
  }
  return scan.productCategory || 'General Packaged Commodity';
};

const CATEGORIES = [
  { 
    id: 'ALL', 
    label: 'All Items', 
    icon: Layers, 
    badgeClass: 'bg-primary/10 text-primary border-primary/20'
  },
  { 
    id: 'Apparel & Textiles', 
    label: 'Apparel & Textiles', 
    sublabel: 'Clothes & Garments',
    icon: Shirt, 
    badgeClass: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800'
  },
  { 
    id: 'Food & Beverages', 
    label: 'Food & Beverages', 
    icon: Utensils, 
    badgeClass: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
  },
  { 
    id: 'Cosmetics & Personal Care', 
    label: 'Cosmetics & Care', 
    icon: Sparkles, 
    badgeClass: 'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-950/50 dark:text-pink-300 dark:border-pink-800'
  },
  { 
    id: 'Electronics & Appliances', 
    label: 'Electronics', 
    icon: Cpu, 
    badgeClass: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800'
  },
  { 
    id: 'General Packaged Commodity', 
    label: 'General Commodity', 
    icon: Package, 
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
  },
];

function ProductThumbnail({ scan }) {
  const [hasError, setHasError] = useState(false);
  const category = resolveCategory(scan);
  const catConfig = CATEGORIES.find(c => c.id === category) || CATEGORIES[CATEGORIES.length - 1];
  const CatIcon = catConfig.icon;

  const primaryUrl = getImageUrl(scan.imagePath);

  // If image fails to load or no image path, render a crisp category badge instead of broken square
  if (hasError || !primaryUrl) {
    return (
      <div className={`h-12 w-12 rounded-xl flex-shrink-0 flex flex-col items-center justify-center border shadow-sm ${catConfig.badgeClass}`} title={scan.extractedInfo?.productName || category}>
        <CatIcon className="w-5 h-5 mb-0.5 opacity-90" />
        <span className="text-[8px] font-black uppercase tracking-tighter truncate max-w-[42px] px-0.5">
          {(scan.extractedInfo?.productName || category || 'ITEM').slice(0, 5)}
        </span>
      </div>
    );
  }

  return (
    <div className="h-12 w-12 rounded-xl bg-white dark:bg-slate-900 border border-border flex-shrink-0 flex items-center justify-center overflow-hidden shadow-sm">
      <img 
        src={primaryUrl} 
        alt={scan.extractedInfo?.productName || 'Product thumbnail'} 
        className="max-h-full max-w-full object-contain p-0.5 transition-transform hover:scale-110" 
        onError={() => setHasError(true)} 
      />
    </div>
  );
}

export default function History() {
  const [history, setHistory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
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

  // Calculate scan count per category
  const categoryCounts = useMemo(() => {
    const counts = { ALL: history.length };
    CATEGORIES.forEach(cat => {
      if (cat.id !== 'ALL') counts[cat.id] = 0;
    });

    history.forEach(scan => {
      const cat = resolveCategory(scan);
      if (counts[cat] !== undefined) {
        counts[cat] = (counts[cat] || 0) + 1;
      } else {
        counts['General Packaged Commodity'] = (counts['General Packaged Commodity'] || 0) + 1;
      }
    });

    return counts;
  }, [history]);

  // Filter history by category AND search query
  const filteredHistory = useMemo(() => {
    return history.filter(scan => {
      const categoryMatch = selectedCategory === 'ALL' || resolveCategory(scan) === selectedCategory;
      const term = searchTerm.toLowerCase().trim();
      const textMatch = !term || 
        scan.extractedInfo?.productName?.toLowerCase().includes(term) || 
        scan._id.toLowerCase().includes(term) ||
        scan.extractedText?.toLowerCase().includes(term);

      return categoryMatch && textMatch;
    });
  }, [history, selectedCategory, searchTerm]);

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col relative transition-colors duration-500">
      <div className="absolute top-[-5%] left-[20%] w-[600px] h-[600px] bg-primary/10 blur-[150px] rounded-full pointer-events-none"></div>
      
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 relative z-10">
        <div>
          <h1 className="text-4xl font-black text-foreground tracking-tight">Scan History</h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Review past compliance scans categorized by commodity type.
          </p>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="mb-6 relative z-10">
        <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Filter className="w-3.5 h-3.5" />
          Filter by Commodity Category
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            const count = categoryCounts[cat.id] || 0;

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold border transition-all duration-200 shadow-sm ${
                  isSelected
                    ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20 scale-[1.02]'
                    : 'bg-card/70 hover:bg-card text-muted-foreground hover:text-foreground border-border/60 hover:border-border'
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? 'text-primary-foreground' : 'text-primary'}`} />
                <span>{cat.label}</span>
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  isSelected 
                    ? 'bg-white/20 text-white' 
                    : 'bg-black/5 dark:bg-white/10 text-muted-foreground'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search Bar & Active Filter Bar */}
      <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 relative z-10">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
          <input
            type="text"
            className="block w-full pl-11 pr-4 py-2.5 border border-border/50 rounded-2xl bg-black/5 dark:bg-white/5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-inner backdrop-blur-md transition-all placeholder:text-muted-foreground/60"
            placeholder={
              selectedCategory === 'ALL'
                ? "Search across all scans..."
                : `Search in ${selectedCategory}...`
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {selectedCategory !== 'ALL' && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Showing: <strong className="text-foreground">{selectedCategory}</strong> ({filteredHistory.length})</span>
            <button
              onClick={() => setSelectedCategory('ALL')}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-semibold ml-2"
            >
              <X className="w-3 h-3" /> Clear filter
            </button>
          </div>
        )}
      </div>

      {/* History Table Card */}
      <div className="flex-1 glass dark:glass-dark rounded-3xl border border-border/50 shadow-2xl overflow-hidden flex flex-col relative z-10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/5 dark:bg-white/5 border-b border-border/50 text-muted-foreground text-xs font-bold uppercase tracking-widest">
                <th className="px-6 py-4">Product / Label</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Scan Date</th>
                <th className="px-6 py-4">Score</th>
                <th className="px-6 py-4">Risk Level</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-muted-foreground">Loading scan history...</td>
                </tr>
              ) : filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-16 text-center">
                    <div className="max-w-md mx-auto flex flex-col items-center">
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-3">
                        {selectedCategory === 'Apparel & Textiles' ? <Shirt className="w-7 h-7" /> : <Package className="w-7 h-7" />}
                      </div>
                      <h3 className="text-base font-bold text-foreground">No records found</h3>
                      <p className="text-xs text-muted-foreground mt-1 text-center">
                        {selectedCategory === 'ALL'
                          ? "You haven't scanned any product packages yet."
                          : `No scans found under "${selectedCategory}". Click below to show all records or scan a new package.`}
                      </p>
                      {selectedCategory !== 'ALL' && (
                        <button
                          onClick={() => setSelectedCategory('ALL')}
                          className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground shadow-sm hover:opacity-95"
                        >
                          View All Scans
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredHistory.map((scan) => {
                  const category = resolveCategory(scan);
                  const catConfig = CATEGORIES.find(c => c.id === category) || CATEGORIES[CATEGORIES.length - 1];
                  const CatIcon = catConfig.icon;

                  return (
                    <tr key={scan._id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                      {/* Product Thumbnail & Details */}
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <ProductThumbnail scan={scan} />
                          <div className="ml-4">
                            <div className="font-semibold text-foreground text-sm">
                              {scan.extractedInfo?.productName || 'Unknown Product'}
                            </div>
                            <div className="text-xs text-muted-foreground truncate w-44" title={scan._id}>
                              ID: {scan._id}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category Badge */}
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setSelectedCategory(category)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all hover:scale-105 ${catConfig.badgeClass}`}
                          title={`Filter by ${category}`}
                        >
                          <CatIcon className="w-3.5 h-3.5" />
                          <span>{category}</span>
                        </button>
                      </td>

                      {/* Timestamp */}
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        <div className="flex items-center">
                          <Clock className="w-3.5 h-3.5 mr-1.5 opacity-70" />
                          {new Date(scan.timestamp).toLocaleString(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })}
                        </div>
                      </td>

                      {/* Score */}
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                            scan.score >= 90 ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' :
                            scan.score >= 70 ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800' :
                            'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'
                        }`}>
                          {scan.score}%
                        </span>
                      </td>

                      {/* Risk Level */}
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                            scan.riskLevel === 'LOW' ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' :
                            scan.riskLevel === 'MEDIUM' ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800' :
                            'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'
                        }`}>
                          {scan.riskLevel}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2 opacity-80 group-hover:opacity-100 transition-opacity">
                          <Link 
                            to={`/results/${scan._id}`}
                            className="p-2 text-muted-foreground hover:text-primary bg-card/80 hover:bg-card border border-border/50 rounded-xl shadow-sm hover:shadow transition-all"
                            title="View Full Compliance Report"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button 
                            onClick={() => handleDelete(scan._id)}
                            className="p-2 text-muted-foreground hover:text-red-500 bg-card/80 hover:bg-card border border-border/50 rounded-xl shadow-sm hover:shadow transition-all"
                            title="Delete Scan Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
