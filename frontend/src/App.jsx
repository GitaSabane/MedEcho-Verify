import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Activity, Heart, AlertTriangle, CheckCircle, UploadCloud,
  FileText, Loader2, Zap, Scan, ShieldAlert, TrendingUp,
  TrendingDown, Camera, Mic, Clipboard, BrainCircuit
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000';

function App() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [auditResult, setAuditResult] = useState(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [renderedBBox, setRenderedBBox] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef(null);
  const imageContainerRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      processImageFile(file);
    }
  };

  const processImageFile = (file) => {
    setSelectedImage(file);
    const previewUrl = URL.createObjectURL(file);
    setImagePreviewUrl(previewUrl);
    setAuditResult(null);
    setRenderedBBox(null);

    const img = new Image();
    img.onload = () => {
      setImageDimensions({ width: img.width, height: img.height });
    };
    img.src = previewUrl;
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) processImageFile(file);
  };

  const loadSampleConflictCase = async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0a0e27';
    ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = '#16213e';
    ctx.fillRect(40, 40, 432, 432);
    ctx.fillStyle = '#e94560';
    ctx.font = 'bold 26px "Inter", monospace';
    ctx.fillText('SIMULATED X-RAY', 140, 260);
    ctx.font = 'bold 38px monospace';
    ctx.fillStyle = '#ff6b6b';
    ctx.fillText('LEFT LUNG', 170, 350);
    ctx.fillStyle = '#0f3460';
    ctx.beginPath();
    ctx.ellipse(256, 256, 170, 190, 0, 0, 2 * Math.PI);
    ctx.fill();

    canvas.toBlob((blob) => {
      const file = new File([blob], 'sample_left_pneumonia.png', { type: 'image/png' });
      processImageFile(file);
    });

    setTranscript("Patient presents with right lower lobe pneumonia, infiltrates noted on right side. No cardiomegaly. Recommendation: antibiotics.");
    setAuditResult(null);
    setRenderedBBox(null);
  };

  const executeAudit = async () => {
    if (!selectedImage) {
      alert('Please upload a chest X-ray image first.');
      return;
    }
    if (!transcript.trim()) {
      alert('Please enter clinical notes transcript.');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', selectedImage);
    formData.append('transcript', transcript);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/verify`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      });

      setAuditResult(response.data);

      if (response.data.vision_analysis.bounding_box && imageContainerRef.current) {
        const containerRect = imageContainerRef.current.getBoundingClientRect();
        const imgNaturalWidth = response.data.vision_analysis.image_dimensions.width;
        const imgNaturalHeight = response.data.vision_analysis.image_dimensions.height;
        const scaleX = containerRect.width / imgNaturalWidth;
        const scaleY = containerRect.height / imgNaturalHeight;
        const [x, y, w, h] = response.data.vision_analysis.bounding_box;
        setRenderedBBox({
          left: x * scaleX,
          top: y * scaleY,
          width: w * scaleX,
          height: h * scaleY,
        });
      }
    } catch (error) {
      console.error('Audit failed:', error);
      alert(`Error: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  const updateBoundingBox = useCallback(() => {
    if (auditResult && auditResult.vision_analysis.bounding_box && imageContainerRef.current) {
      const containerRect = imageContainerRef.current.getBoundingClientRect();
      const imgNaturalWidth = auditResult.vision_analysis.image_dimensions.width;
      const imgNaturalHeight = auditResult.vision_analysis.image_dimensions.height;
      const scaleX = containerRect.width / imgNaturalWidth;
      const scaleY = containerRect.height / imgNaturalHeight;
      const [x, y, w, h] = auditResult.vision_analysis.bounding_box;
      setRenderedBBox({
        left: x * scaleX,
        top: y * scaleY,
        width: w * scaleX,
        height: h * scaleY,
      });
    }
  }, [auditResult]);

  useEffect(() => {
    window.addEventListener('resize', updateBoundingBox);
    return () => window.removeEventListener('resize', updateBoundingBox);
  }, [updateBoundingBox]);

  useEffect(() => {
    updateBoundingBox();
  }, [auditResult, updateBoundingBox]);

  const CMCIGauge = ({ score, conflict }) => {
    const percentage = Math.min(100, Math.max(0, score));
    const isConflict = conflict;
    const color = isConflict ? '#ef4444' : percentage >= 85 ? '#10b981' : percentage >= 50 ? '#f59e0b' : '#ef4444';
    const gradientId = `cmci-grad-${Math.random()}`;

    return (
      <div className="flex flex-col items-center p-6 rounded-2xl bg-white/40 backdrop-blur-sm shadow-lg border border-white/30">
        <div className="relative w-36 h-36">
          <svg className="w-full h-full transform -rotate-90">
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={color} stopOpacity="0.8" />
                <stop offset="100%" stopColor={color} stopOpacity="1" />
              </linearGradient>
            </defs>
            <circle cx="72" cy="72" r="62" stroke="#e2e8f0" strokeWidth="10" fill="none" />
            <circle
              cx="72"
              cy="72"
              r="62"
              stroke={`url(#${gradientId})`}
              strokeWidth="10"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 62 * (percentage / 100)} ${2 * Math.PI * 62 * (1 - percentage / 100)}`}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-4xl font-black ${isConflict ? 'text-red-600' : percentage >= 85 ? 'text-green-600' : percentage >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
              {percentage.toFixed(0)}%
            </span>
            <span className="text-xs font-medium text-gray-500 mt-1">CMCI</span>
          </div>
        </div>
        <div className="mt-3 text-center">
          <p className={`text-sm font-semibold px-3 py-1 rounded-full ${isConflict ? 'bg-red-100 text-red-700' : percentage >= 85 ? 'bg-green-100 text-green-700' : percentage >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
            {isConflict ? 'CONFLICT DETECTED' : percentage >= 85 ? 'HIGH CONSISTENCY' : percentage >= 50 ? 'MODERATE' : 'LOW CONSISTENCY'}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated background particles effect */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
      </div>

      {/* Glassmorphism Top Bar */}
      <header className="sticky top-0 z-20 backdrop-blur-xl bg-white/10 border-b border-white/20 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl shadow-lg">
                <Heart className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                  MedEcho-Verify
                </h1>
                <p className="text-xs text-gray-300">Patient Safety Audit Desk // Multimodal Verification</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-emerald-500/20 backdrop-blur-sm px-3 py-1.5 rounded-full border border-emerald-400/30">
                <Activity className="h-4 w-4 text-emerald-400 animate-pulse" />
                <span className="text-xs font-mono text-emerald-200">System Online</span>
              </div>
              <button
                onClick={loadSampleConflictCase}
                className="flex items-center space-x-2 bg-amber-500/20 hover:bg-amber-500/30 backdrop-blur-sm text-amber-200 px-4 py-2 rounded-xl transition-all duration-300 border border-amber-400/30 hover:scale-105"
              >
                <Zap className="h-4 w-4" />
                <span className="text-sm font-medium">Load Sample Conflict</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Wing - Input Section with Glassmorphism */}
          <div className="space-y-6">
            <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-2xl border border-white/20 p-6 transition-all duration-300 hover:shadow-purple-500/20">
              <h2 className="text-xl font-semibold flex items-center gap-2 text-white mb-4">
                <div className="p-1.5 bg-blue-500/30 rounded-lg">
                  <UploadCloud className="h-5 w-5 text-blue-300" />
                </div>
                Clinical Image Upload
              </h2>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-300 cursor-pointer
                  ${isDragging ? 'border-blue-400 bg-blue-500/20 scale-[1.02]' : 'border-white/30 bg-white/5 hover:bg-white/10'}
                  ${imagePreviewUrl ? 'border-green-400/50' : ''}`}
                onClick={() => fileInputRef.current.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {imagePreviewUrl ? (
                  <div className="relative" ref={imageContainerRef}>
                    <img
                      src={imagePreviewUrl}
                      alt="X-Ray Preview"
                      className="max-h-72 mx-auto rounded-lg object-contain shadow-lg"
                      style={{ maxWidth: '100%' }}
                    />
                    {renderedBBox && (
                      <div
                        className="absolute border-3 border-red-500 bg-red-500/30 pointer-events-none rounded-md shadow-[0_0_0_2px_rgba(255,255,255,0.8)] animate-pulse"
                        style={{
                          left: `${renderedBBox.left}px`,
                          top: `${renderedBBox.top}px`,
                          width: `${renderedBBox.width}px`,
                          height: `${renderedBBox.height}px`,
                        }}
                      />
                    )}
                  </div>
                ) : (
                  <div className="py-12">
                    <div className="w-20 h-20 mx-auto bg-white/10 rounded-full flex items-center justify-center mb-4">
                      <UploadCloud className="h-10 w-10 text-gray-300" />
                    </div>
                    <p className="mt-2 text-sm text-gray-200">Drag & drop or click to upload</p>
                    <p className="text-xs text-gray-400 mt-1">Chest X-ray (PNG, JPG, JPEG)</p>
                  </div>
                )}
              </div>
            </div>

            <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-2xl border border-white/20 p-6">
              <h2 className="text-xl font-semibold flex items-center gap-2 text-white mb-4">
                <div className="p-1.5 bg-purple-500/30 rounded-lg">
                  <FileText className="h-5 w-5 text-purple-300" />
                </div>
                Clinical Notes Transcript
              </h2>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Paste or dictate clinical note here...&#10;&#10;Example: 'Left lower lobe pneumonia, no cardiomegaly. Heart size normal.'"
                rows={8}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400 font-mono text-sm resize-none"
              />
            </div>

            <button
              onClick={executeAudit}
              disabled={loading}
              className="group relative w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-xl flex items-center justify-center gap-3 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Analyzing Cross-Modal Consistency...</span>
                </>
              ) : (
                <>
                  <Scan className="h-5 w-5" />
                  <span>Execute Safety Audit</span>
                </>
              )}
            </button>
          </div>

          {/* Right Wing - Diagnostic Audit Results */}
          <div className="space-y-6">
            <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-2xl border border-white/20 p-6 min-h-[600px]">
              <h2 className="text-xl font-semibold flex items-center gap-2 text-white mb-4">
                <div className="p-1.5 bg-emerald-500/30 rounded-lg">
                  <ShieldAlert className="h-5 w-5 text-emerald-300" />
                </div>
                Safety Audit Dashboard
              </h2>

              {!auditResult && !loading && (
                <div className="flex flex-col items-center justify-center h-[450px] text-gray-300">
                  <div className="relative">
                    <BrainCircuit className="h-24 w-24 opacity-20 animate-pulse" />
                    <Scan className="h-12 w-12 absolute top-6 left-6 opacity-60 animate-spin-slow" />
                  </div>
                  <p className="text-center mt-6 text-lg font-medium">Awaiting Clinical Audit</p>
                  <p className="text-sm text-center mt-2 text-gray-400">Upload an image and transcript, then click "Execute Safety Audit"</p>
                </div>
              )}

              {loading && (
                <div className="flex flex-col items-center justify-center h-[450px]">
                  <Loader2 className="h-16 w-16 animate-spin text-blue-400" />
                  <p className="mt-6 text-gray-200">Verifying cross-modal consistency...</p>
                  <p className="text-sm text-gray-400 mt-2">AI is checking laterality and pathology</p>
                </div>
              )}

              {auditResult && !loading && (
                <div className="space-y-6 animate-fadeInUp">
                  {/* Alert Banner */}
                  {auditResult.conflict_detected && (
                    <div className="bg-red-500/20 backdrop-blur-sm border-l-4 border-red-500 p-5 rounded-xl animate-shake">
                      <div className="flex items-center">
                        <AlertTriangle className="h-7 w-7 text-red-400 mr-4" />
                        <div>
                          <h3 className="font-bold text-red-200 text-lg">CRITICAL SAFETY ALERT</h3>
                          <p className="text-red-100 text-sm">{auditResult.alert_message}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {!auditResult.conflict_detected && auditResult.cmci_score >= 85 && (
                    <div className="bg-green-500/20 backdrop-blur-sm border-l-4 border-green-500 p-5 rounded-xl">
                      <div className="flex items-center">
                        <CheckCircle className="h-7 w-7 text-green-400 mr-4" />
                        <div>
                          <h3 className="font-bold text-green-200 text-lg">Verification Passed</h3>
                          <p className="text-green-100 text-sm">{auditResult.alert_message}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {!auditResult.conflict_detected && auditResult.cmci_score < 85 && auditResult.cmci_score >= 50 && (
                    <div className="bg-amber-500/20 backdrop-blur-sm border-l-4 border-amber-500 p-5 rounded-xl">
                      <div className="flex items-center">
                        <AlertTriangle className="h-7 w-7 text-amber-400 mr-4" />
                        <div>
                          <h3 className="font-bold text-amber-200 text-lg">Moderate Discrepancy</h3>
                          <p className="text-amber-100 text-sm">{auditResult.alert_message}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {!auditResult.conflict_detected && auditResult.cmci_score < 50 && (
                    <div className="bg-red-500/20 backdrop-blur-sm border-l-4 border-red-500 p-5 rounded-xl">
                      <div className="flex items-center">
                        <AlertTriangle className="h-7 w-7 text-red-400 mr-4" />
                        <div>
                          <h3 className="font-bold text-red-200 text-lg">Low Consistency</h3>
                          <p className="text-red-100 text-sm">{auditResult.alert_message}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CMCI Gauge */}
                  <CMCIGauge score={auditResult.cmci_score} conflict={auditResult.conflict_detected} />

                  {/* Detailed Analysis Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                      <div className="flex items-center gap-2 mb-3">
                        <Clipboard className="h-4 w-4 text-blue-300" />
                        <p className="font-semibold text-white">Text Analysis</p>
                      </div>
                      <div className="space-y-2 text-sm">
                        <p className="text-gray-200">Laterality: <span className="font-mono text-blue-200">{auditResult.text_analysis.laterality.join(', ') || 'none'}</span></p>
                        <p className="text-gray-200">Pathologies: <span className="font-mono text-purple-200">{auditResult.text_analysis.pathologies.join(', ') || 'none'}</span></p>
                        <p className="text-gray-300 text-xs mt-2">Keywords: {auditResult.text_analysis.keywords_found.join(', ')}</p>
                      </div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                      <div className="flex items-center gap-2 mb-3">
                        <Camera className="h-4 w-4 text-green-300" />
                        <p className="font-semibold text-white">Vision Analysis (AI)</p>
                      </div>
                      <div className="space-y-2 text-sm">
                        <p className="text-gray-200">Laterality: <span className="font-mono text-blue-200">{auditResult.vision_analysis.laterality.join(', ')}</span></p>
                        <p className="text-gray-200">Pathologies: <span className="font-mono text-purple-200">{auditResult.vision_analysis.pathologies.join(', ')}</span></p>
                        <p className="text-gray-300 text-xs mt-2">BBox: {auditResult.vision_analysis.bounding_box.join(', ')}</p>
                      </div>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="text-xs text-gray-400 border-t border-white/10 pt-4 flex justify-between">
                    <span>🕒 {new Date(auditResult.timestamp).toLocaleString()}</span>
                    <span>⚡ {auditResult.processing_time_ms} ms</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;