import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, Upload, X, RefreshCw, AlertCircle, Image as ImageIcon } from 'lucide-react';

interface QrScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

export default function QrScanner({ onScan, onClose }: QrScannerProps) {
  const [mode, setMode] = useState<'camera' | 'file'>('camera');
  const [error, setError] = useState('');
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = async () => {
    setError('');
    setIsStartingCamera(true);

    try {
      // Check if mediaDevices exists
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not supported in this browser");
      }

      // Cleanup existing scanner if any
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            await scannerRef.current.stop();
          }
          await scannerRef.current.clear();
        } catch (_) {}
      }

      const qrElement = document.getElementById("qr-reader-custom");
      if (!qrElement) return;

      const scanner = new Html5Qrcode("qr-reader-custom");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          if (scanner.isScanning) {
            scanner.stop().then(() => onScan(decodedText)).catch(() => {});
          }
        },
        () => {
          // Continuous frame scan callback - ignore standard non-detect frames
        }
      );
    } catch (err: any) {
      console.warn("Camera start not available or permission denied:", err?.message || err);
      const isPermissionDenied = 
        err?.name === 'NotAllowedError' || 
        err?.message?.includes('Permission denied') || 
        err?.name === 'PermissionDeniedError';

      if (isPermissionDenied) {
        setError("Camera permission denied. You can allow camera in browser address bar or use 'Upload Image' below.");
      } else {
        setError("Camera is not available on this device. Please use 'Upload Image' instead.");
      }
    } finally {
      setIsStartingCamera(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    if (mode === 'camera') {
      startCamera();
    } else {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    }

    return () => {
      isMounted = false;
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop().catch(() => {});
          }
        } catch (_) {}
      }
    };
  }, [mode]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      try {
        const scanner = new Html5Qrcode("qr-reader-custom-file");
        const decodedText = await scanner.scanFile(file, true);
        onScan(decodedText);
      } catch (err) {
        setError("Could not find a valid QR code in the image. Please try another image.");
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex flex-col items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-5 flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Camera size={18} />
            </div>
            <div>
              <h3 className="font-black text-base">Scan Student QR Code</h3>
              <p className="text-[11px] text-indigo-100 font-medium">QR அட்டை ஸ்கேன் செய்க</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="hover:bg-white/20 p-2 rounded-xl transition-colors text-white/80 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex border-b border-slate-100 bg-slate-50/50">
          <button
            className={`flex-1 py-3.5 font-black text-xs flex items-center justify-center gap-2 transition-all ${
              mode === 'camera' 
                ? 'border-b-2 border-indigo-600 text-indigo-600 bg-white shadow-xs' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
            onClick={() => { setMode('camera'); setError(''); }}
          >
            <Camera size={16} /> Live Camera
          </button>
          <button
            className={`flex-1 py-3.5 font-black text-xs flex items-center justify-center gap-2 transition-all ${
              mode === 'file' 
                ? 'border-b-2 border-indigo-600 text-indigo-600 bg-white shadow-xs' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
            onClick={() => { setMode('file'); setError(''); }}
          >
            <Upload size={16} /> Upload Image
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3.5 rounded-2xl text-xs flex items-start gap-2.5">
              <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold leading-relaxed">{error}</p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => { setMode('file'); setError(''); }}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] rounded-lg shadow-xs transition-all"
                  >
                    Switch to Upload Image
                  </button>
                  {mode === 'camera' && (
                    <button
                      onClick={startCamera}
                      className="px-3 py-1 bg-white hover:bg-slate-100 text-amber-800 border border-amber-300 font-bold text-[11px] rounded-lg transition-all flex items-center gap-1"
                    >
                      <RefreshCw size={11} /> Retry Camera
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {mode === 'camera' && (
            <div className="rounded-2xl overflow-hidden bg-slate-950 aspect-square flex items-center justify-center relative shadow-inner border border-slate-800">
              <div id="qr-reader-custom" className="w-full h-full"></div>
              {/* Overlay scanning frame */}
              <div className="absolute inset-0 pointer-events-none border-[35px] border-black/40 rounded-2xl flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-indigo-400 border-dashed rounded-xl relative animate-pulse"></div>
              </div>
            </div>
          )}

          {mode === 'file' && (
            <div className="flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-indigo-200 rounded-2xl bg-indigo-50/30 hover:bg-indigo-50/50 transition-colors">
              <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-3 shadow-sm">
                <ImageIcon size={28} />
              </div>
              <p className="text-slate-800 font-bold text-sm mb-1 text-center">Select QR Code Image / Screenshot</p>
              <p className="text-slate-400 text-xs mb-5 text-center">Supports PNG, JPG, JPEG QR Card photos</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-black text-xs shadow-md hover:shadow-lg transition-all transform active:scale-95 flex items-center gap-2"
              >
                <Upload size={15} /> Choose QR Image
              </button>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
              <div id="qr-reader-custom-file" className="hidden"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
