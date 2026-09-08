import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, CheckCircle2, ArrowRight, X, ShieldAlert, MapPin, Landmark, Sparkles } from 'lucide-react';
import axios from 'axios';
import { API_URL, cn } from '../lib/utils';

export default function ScanPage() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [selectedState, setSelectedState] = useState('Telangana');
  const [availableStates, setAvailableStates] = useState([
    'Telangana',
    'Maharashtra',
    'Karnataka',
    'Tamil Nadu',
    'Delhi',
    'Gujarat',
    'Central (All India)'
  ]);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchStates = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/rules/states`);
        if (Array.isArray(res.data) && res.data.length > 0) {
          const list = [...res.data];
          if (!list.includes('Central (All India)')) {
            list.push('Central (All India)');
          }
          setAvailableStates(list);
        }
      } catch (e) {
        console.warn('Could not fetch state list from API, using standard states:', e.message);
      }
    };
    fetchStates();
  }, []);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleFileSelection = (selectedFile) => {
    if (!selectedFile.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }
    setFile(selectedFile);
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreview(objectUrl);
  };

  const steps = [
    'Image received',
    'Detecting text & dimensions...',
    'Extracting statutory declarations...',
    `Loading Central Rules + ${selectedState !== 'Central (All India)' ? selectedState : 'National'} Rules...`,
    'Generating compliance audit...'
  ];

  const handleAnalyze = async () => {
    if (!file) return;
    
    setIsProcessing(true);
    
    const progressInterval = setInterval(() => {
      setProgressStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 1100);

    const formData = new FormData();
    formData.append('productImage', file);
    formData.append('inspectionState', selectedState);
    formData.append('inspectionDate', new Date().toISOString());

    try {
      const response = await axios.post(`${API_URL}/api/scan`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      clearInterval(progressInterval);
      setProgressStep(steps.length - 1);
      
      setTimeout(() => {
        navigate(`/results/${response.data.scanId}`);
      }, 500);

    } catch (error) {
      clearInterval(progressInterval);
      setIsProcessing(false);
      setProgressStep(0);
      alert('Failed to analyze the product. Please try again.');
      console.error(error);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto h-full flex flex-col items-center justify-center relative transition-colors duration-500">
      <div className="absolute top-[10%] left-[20%] w-[600px] h-[600px] bg-primary/20 blur-[150px] rounded-full pointer-events-none"></div>
      
      <div className="text-center mb-8 relative z-10">
        <h1 className="text-5xl font-black text-foreground tracking-tight mb-4">Analyze Product Label</h1>
        <p className="text-muted-foreground text-xl max-w-2xl mx-auto">
          Verify packaging against both <strong>Central Legal Metrology Rules, 2011</strong> and <strong>State Enforcement Rules</strong>.
        </p>
      </div>

      {/* State & Jurisdiction Selector Panel */}
      <div className="w-full max-w-3xl mb-8 relative z-10">
        <div className="glass dark:glass-dark bg-card/80 dark:bg-card/40 rounded-2xl p-5 border border-border/60 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <label htmlFor="state-selector" className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                Inspection Jurisdiction (State)
              </label>
              <div className="text-sm font-semibold text-foreground">
                Select the State where inspection is being conducted:
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              id="state-selector"
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              disabled={isProcessing}
              className="bg-black/5 dark:bg-white/5 border border-border/70 text-foreground font-semibold text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary shadow-inner cursor-pointer w-full sm:w-56"
            >
              {availableStates.map((st) => (
                <option key={st} value={st} className="bg-card text-foreground">
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Dynamic Rule Scope Notification */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-2 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Landmark className="w-4 h-4 text-primary" />
            <span>
              Active Rule Scope: <strong className="text-foreground">Central Rules (14)</strong>
              {selectedState !== 'Central (All India)' && (
                <> + <strong className="text-primary">{selectedState} State Enforcement Rules</strong></>
              )}
            </span>
          </div>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            Dynamic Dual Jurisdiction
          </span>
        </div>
      </div>

      <div className="w-full relative z-10">
        {!preview && !isProcessing ? (
          <div 
            className="w-full max-w-3xl mx-auto"
            onDragOver={handleDrag}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
          >
            <div className={`
              glass dark:glass-dark bg-card/80 dark:bg-card/30 border-2 border-dashed rounded-3xl p-16 text-center transition-all duration-300 relative overflow-hidden group shadow-2xl
              ${isDragging ? 'border-primary bg-primary/5 scale-[1.02] shadow-[0_0_50px_rgba(var(--primary),0.3)]' : 'border-border/50 hover:border-primary/50 hover:bg-black/5 dark:hover:bg-white/5'}
            `}>
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
              
              <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-inner">
                <UploadCloud className="w-12 h-12 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-3">Drag & Drop your package label image</h3>
              <p className="text-muted-foreground mb-8 text-lg">or click to browse from your device</p>
              
              <label 
                className="cursor-pointer bg-primary text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all hover:-translate-y-1 inline-block border border-transparent"
              >
                Select Image
                <input type="file" className="hidden" accept="image/*" onChange={handleChange} />
              </label>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-4xl glass dark:glass-dark bg-card/80 dark:bg-card/30 rounded-3xl border border-border/50 shadow-2xl overflow-hidden flex flex-col md:flex-row relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-purple-500 to-primary"></div>
            
            <div className="md:w-1/2 bg-black/5 dark:bg-black/40 flex items-center justify-center p-8 relative group">
              <img src={preview} alt="Product Preview" className="max-h-[450px] object-contain rounded-xl shadow-2xl ring-1 ring-border/50" />
              {!isProcessing && (
                <button 
                  onClick={() => { setFile(null); setPreview(null); }}
                  className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors backdrop-blur-sm"
                  title="Remove image"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="md:w-1/2 p-10 flex flex-col justify-between border-t md:border-t-0 md:border-l border-border/50">
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-2">Package Image Ready</h3>
                <p className="text-muted-foreground mb-6">
                  {file?.name} ({(file?.size / (1024 * 1024)).toFixed(2)} MB)
                </p>

                {/* State Confirmation Card */}
                <div className="mb-6 p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-border/50 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground block">Selected Jurisdiction</span>
                    <strong className="text-foreground text-sm flex items-center gap-1.5 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-primary" /> {selectedState}
                    </strong>
                  </div>
                  <button
                    onClick={() => {
                      const next = availableStates[(availableStates.indexOf(selectedState) + 1) % availableStates.length];
                      setSelectedState(next);
                    }}
                    disabled={isProcessing}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Change
                  </button>
                </div>

                {isProcessing && (
                  <div className="space-y-4 mb-6 animate-in fade-in duration-300">
                    <div className="flex justify-between text-sm font-semibold text-foreground mb-1">
                      <span>Analyzing Compliance</span>
                      <span>{Math.round(((progressStep + 1) / steps.length) * 100)}%</span>
                    </div>
                    <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-2 overflow-hidden shadow-inner">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-500" 
                        style={{ width: `${((progressStep + 1) / steps.length) * 100}%` }}
                      ></div>
                    </div>
                    
                    <div className="space-y-3 mt-6">
                      {steps.map((step, idx) => (
                        <div key={idx} className={`flex items-center text-sm transition-opacity duration-300 ${idx <= progressStep ? 'opacity-100 text-foreground font-medium' : 'opacity-40 text-muted-foreground'}`}>
                          <CheckCircle2 className={`w-4 h-4 mr-3 ${idx < progressStep ? 'text-primary' : idx === progressStep ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
                          {step}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {!isProcessing && (
                <button
                  onClick={handleAnalyze}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300 flex items-center justify-center group"
                >
                  <span>Evaluate for {selectedState}</span>
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
