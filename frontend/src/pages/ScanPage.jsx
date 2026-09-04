import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileImage, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import axios from 'axios';
import { API_URL, cn } from '../lib/utils';

export default function ScanPage() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const navigate = useNavigate();

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  }, []);

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
    'Detecting text...',
    'Extracting product information...',
    'Applying compliance rules...',
    'Generating results...'
  ];

  const handleAnalyze = async () => {
    if (!file) return;
    
    setIsProcessing(true);
    
    // Simulate progression for UI while backend processes
    const progressInterval = setInterval(() => {
      setProgressStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 1200);

    const formData = new FormData();
    formData.append('productImage', file);

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
      
      <div className="text-center mb-12 relative z-10">
        <h1 className="text-5xl font-black text-foreground tracking-tight mb-4">Analyze Product Label</h1>
        <p className="text-muted-foreground text-xl max-w-2xl mx-auto">
          Upload packaging images for instant AI verification against Legal Metrology Rules, 2011.
        </p>
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
              <h3 className="text-2xl font-bold text-foreground mb-3">Drag & Drop your image here</h3>
              <p className="text-muted-foreground mb-8 text-lg">or click to browse from your computer</p>
              
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
                  className="absolute top-6 right-6 bg-red-500/80 text-white rounded-full p-2.5 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 hover:scale-110 backdrop-blur-md shadow-lg"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              )}
            </div>
            
            <div className="md:w-1/2 p-10 flex flex-col justify-center border-t md:border-t-0 md:border-l border-border/50 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent">
              <div className="flex items-start mb-8 p-4 rounded-2xl bg-white/50 dark:bg-white/5 border border-border/50 shadow-sm">
                <div className="p-3 bg-primary/10 dark:bg-primary/20 rounded-xl mr-4 shadow-inner">
                  <FileImage className="w-6 h-6 text-primary" />
                </div>
                <div className="overflow-hidden">
                  <h3 className="font-semibold text-lg truncate text-foreground">{file?.name}</h3>
                  <p className="text-sm text-primary font-medium mt-1">{(file?.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
              </div>

              {!isProcessing ? (
                <button 
                  onClick={handleAnalyze}
                  className="w-full bg-gradient-to-r from-primary to-purple-600 text-white px-6 py-4 rounded-xl font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all text-lg hover:-translate-y-1 relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full skew-x-12 transition-transform duration-700"></div>
                  Start AI Analysis
                </button>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center text-primary font-bold text-xl mb-4">
                    <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                    AI is Processing...
                  </div>
                  <div className="space-y-4">
                    {steps.map((step, idx) => (
                      <div key={idx} className={cn(
                        "flex items-center text-sm transition-all duration-500 p-3 rounded-lg border",
                        idx < progressStep ? "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-400/10 font-medium border-transparent" : 
                        idx === progressStep ? "text-foreground bg-black/5 dark:bg-white/10 shadow-inner border-border/50 font-medium translate-x-2" : "text-muted-foreground opacity-40 border-transparent"
                      )}>
                        {idx < progressStep ? (
                          <CheckCircle2 className="w-5 h-5 mr-3 flex-shrink-0" />
                        ) : idx === progressStep ? (
                          <Loader2 className="w-5 h-5 mr-3 animate-spin text-primary flex-shrink-0" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-current mr-3 flex-shrink-0" />
                        )}
                        {step}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
