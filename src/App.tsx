/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Leaf, ShieldCheck, AlertCircle, RefreshCw, ChevronRight, Activity, Beaker } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { diagnoseDisease } from './services/geminiService';
import { applyExG } from './utils/cvUtils';

interface DiagnosisResult {
  markdown: string;
  exgPreview: string;
}

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize camera
  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch (err) {
      console.error("Camera error:", err);
      setError("Unable to access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setImage(dataUrl);
        stopCamera();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const processAndDiagnose = async () => {
    if (!image) return;
    setProcessing(true);
    setError(null);

    try {
      // 1. Process with ExG
      const tempImg = new Image();
      tempImg.src = image;
      await new Promise(resolve => tempImg.onload = resolve);

      const canvas = document.createElement('canvas');
      canvas.width = tempImg.width;
      canvas.height = tempImg.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(tempImg, 0, 0);
      
      const exgData = applyExG(ctx, canvas.width, canvas.height);
      ctx.putImageData(exgData, 0, 0);
      const exgPreview = canvas.toDataURL('image/jpeg');

      // 2. Call Gemini
      const base64Data = image.split(',')[1];
      const markdown = await diagnoseDisease(base64Data, 'image/jpeg');

      setResult({ markdown: markdown || "No diagnosis available.", exgPreview });
    } catch (err) {
      console.error(err);
      setError("Diagnosis failed. Please try again with a clearer image.");
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setImage(null);
    setResult(null);
    setError(null);
    stopCamera();
  };

  return (
    <div className="min-h-screen bg-[#F0F2F0] text-[#1A1A1A] font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-600 rounded-lg text-white">
            <Leaf size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">AgroPulse</h1>
            <p className="text-[10px] uppercase tracking-widest text-emerald-700 font-semibold">Vision AI for Farmers</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-6">
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
            <ShieldCheck size={14} className="text-emerald-500" />
            VDI Algorithm v2 (ExG + Contour)
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
            <Beaker size={14} className="text-purple-500" />
            Gemini 3.0 Real-time Core
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 md:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Action Panel */}
          <div className="lg:col-span-5 space-y-6">
            {!image && !stream ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm overflow-hidden relative"
              >
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <Leaf size={120} />
                </div>
                <h2 className="text-2xl font-bold mb-2">Identify Crop Health</h2>
                <p className="text-gray-500 text-sm mb-8">Upload or capture a clear photo of the affected plant leaf for instant AI analysis.</p>
                
                <div className="grid grid-cols-1 gap-4">
                  <button 
                    onClick={startCamera}
                    className="flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-4 rounded-2xl transition-all shadow-lg active:scale-95"
                  >
                    <Camera size={20} />
                    Open Field Camera
                  </button>
                  <label className="flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-[#1A1A1A] border-2 border-dashed border-gray-200 font-semibold py-4 rounded-2xl cursor-pointer transition-all active:scale-95">
                    <Upload size={20} className="text-emerald-600" />
                    Upload from Gallery
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleFileUpload} 
                      ref={fileInputRef}
                    />
                  </label>
                </div>

                <div className="mt-10 pt-6 border-t border-gray-100 italic text-[11px] text-gray-400">
                  <p>Developed using Excess Green Index (ExG) + Contour Detection logic and PlantVillage standards.</p>
                </div>
              </motion.div>
            ) : null}

            {stream && (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-black rounded-3xl overflow-hidden relative shadow-2xl aspect-[3/4]"
              >
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 p-8 flex items-center justify-between bg-gradient-to-t from-black/60 to-transparent">
                  <button 
                    onClick={stopCamera}
                    className="p-4 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-colors"
                  >
                    <ChevronRight className="rotate-180" />
                  </button>
                  <button 
                    onClick={captureImage}
                    className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"
                  >
                    <div className="w-14 h-14 border-4 border-emerald-500 rounded-full" />
                  </button>
                  <div className="w-12 h-12" /> {/* Spacer */}
                </div>
                <div className="absolute top-4 left-4 flex gap-2">
                   <div className="bg-emerald-500/80 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] text-white font-bold uppercase trekking-widest">Live</div>
                </div>
              </motion.div>
            )}

            {image && !result && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100">
                  <img src={image} alt="Preview" className="w-full h-auto rounded-2xl shadow-inner" />
                </div>
                
                {processing ? (
                  <div className="bg-white rounded-3xl p-10 text-center shadow-sm border border-gray-100">
                    <div className="relative w-20 h-20 mx-auto mb-6">
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 border-4 border-emerald-100 border-t-emerald-600 rounded-full"
                      />
                      <div className="absolute inset-0 flex items-center justify-center text-emerald-600">
                         <Activity size={32} />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold mb-2">Analyzing Biomarkers</h3>
                    <p className="text-gray-500 text-sm">Applying ExG indexing and lesion contouring algorithm...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={reset}
                      className="py-4 bg-white border border-gray-200 rounded-2xl font-bold text-gray-500 hover:bg-gray-50 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <RefreshCw size={18} />
                      Retry
                    </button>
                    <button 
                      onClick={processAndDiagnose}
                      className="py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <ShieldCheck size={18} />
                      Analyze Now
                    </button>
                  </div>
                ) }
              </motion.div>
            )}
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-7">
            {error && (
              <div className="bg-red-50 border border-red-100 p-6 rounded-3xl flex items-start gap-4 mb-6">
                <AlertCircle className="text-red-500 flex-shrink-0" size={24} />
                <div>
                  <h4 className="font-bold text-red-900">System Interruption</h4>
                  <p className="text-red-700 text-sm mt-1">{error}</p>
                </div>
              </div>
            )}

            {!result && !processing && !error && (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-10 bg-white/50 border border-dashed border-gray-200 rounded-[40px]">
                <div className="mb-6 p-6 bg-white rounded-full shadow-sm text-gray-300">
                  <Activity size={48} />
                </div>
                <h3 className="text-xl font-bold text-gray-400">Diagnosis Pending</h3>
                <p className="text-gray-400 text-sm max-w-xs mt-2">Waiting for input image to begin diagnostic procedures.</p>
              </div>
            )}

            {result && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-8"
              >
                {/* CV Step Visualization */}
                <div className="bg-[#151619] rounded-[40px] p-8 text-white shadow-2xl relative overflow-hidden">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-mono tracking-widest uppercase text-emerald-400">Step 1: Segmentation (ExG)</h3>
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <div className="w-2 h-2 rounded-full bg-gray-700" />
                      <div className="w-2 h-2 rounded-full bg-gray-700" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <p className="text-[10px] text-gray-500 uppercase font-bold">Source Index</p>
                       <img src={image!} alt="Original" className="w-full rounded-xl aspect-video object-cover grayscale opacity-50" />
                    </div>
                    <div className="space-y-2">
                       <p className="text-[10px] text-emerald-400 uppercase font-bold">Processed Lesions</p>
                       <div className="relative">
                          <img src={result.exgPreview} alt="ExG" className="w-full rounded-xl aspect-video object-cover" />
                          <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none rounded-xl" />
                       </div>
                    </div>
                  </div>
                  <div className="mt-6 flex items-center gap-3">
                    <div className="flex-1 h-[1px] bg-white/10" />
                    <p className="text-[10px] text-gray-400 font-medium">Excess Green Algorithm identifying chlorophyll-deficient areas</p>
                    <div className="flex-1 h-[1px] bg-white/10" />
                  </div>
                </div>

                {/* Gemini Diagnosis */}
                <div className="bg-white rounded-[40px] p-10 border border-gray-100 shadow-sm relative">
                  <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                    <ShieldCheck size={180} />
                  </div>
                  <div className="flex items-center gap-3 mb-8">
                     <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase rounded-full">Final Report</span>
                     <span className="w-1 h-1 bg-gray-300 rounded-full" />
                     <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Medical Grade Analysis</span>
                  </div>
                  
                  <div className="markdown-body prose prose-emerald max-w-none">
                    <ReactMarkdown>{result.markdown}</ReactMarkdown>
                  </div>

                  <div className="mt-10 flex gap-4 no-print">
                    <button 
                      onClick={reset}
                      className="flex-1 py-4 border-2 border-emerald-600 text-emerald-600 font-bold rounded-2xl hover:bg-emerald-50 active:scale-95 transition-all text-sm"
                    >
                      New Case
                    </button>
                    <button 
                      onClick={() => window.print()}
                      className="flex-1 py-4 bg-emerald-600 text-white font-bold rounded-2xl shadow-lg hover:bg-emerald-700 active:scale-95 transition-all text-sm"
                    >
                      Download PDF Report
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </main>

      {/* Hidden canvas for processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Footer Branding */}
      <footer className="mt-20 py-10 px-6 border-t border-gray-200">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 opacity-30">
            <Leaf size={20} />
            <span className="text-sm font-bold">AgroPulse Research Lab</span>
          </div>
          <div className="flex gap-8 text-[11px] text-gray-400 font-medium uppercase tracking-widest">
            <span className="hover:text-emerald-600 cursor-pointer transition-colors">PlantVillage Dataset</span>
            <span className="hover:text-emerald-600 cursor-pointer transition-colors">Computer Vision API</span>
            <span className="hover:text-emerald-600 cursor-pointer transition-colors">Farmer Support</span>
          </div>
        </div>
      </footer>

      {/* Tailwind Print Overrides */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          header { margin-bottom: 2rem !important; border: none !important; }
        }
        .markdown-body h1 { font-size: 1.8rem; font-weight: 800; margin-bottom: 1.5rem; color: #064e3b; }
        .markdown-body h2 { font-size: 1.4rem; font-weight: 700; margin-top: 2rem; margin-bottom: 1rem; color: #065f46; border-bottom: 1px solid #ecfdf5; padding-bottom: 0.5rem; }
        .markdown-body h3 { font-size: 1.1rem; font-weight: 700; margin-top: 1.5rem; color: #047857; }
        .markdown-body p { margin-bottom: 1rem; line-height: 1.7; color: #374151; }
        .markdown-body ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 1.5rem; }
        .markdown-body li { margin-bottom: 0.5rem; color: #4b5563; }
        .markdown-body strong { color: #064e3b; font-weight: 700; }
      `}</style>
    </div>
  );
}

