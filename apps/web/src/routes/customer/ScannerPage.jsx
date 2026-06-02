import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { api } from '../../services/apiClient';
import { ChevronLeft, QrCode, AlertTriangle, RefreshCw, Send, Check } from 'lucide-react';
import BottomNav from '../../components/ui/BottomNav';

export default function ScannerPage() {
  const navigate = useNavigate();
  const scannerRef = useRef(null);

  const [scanError, setScanError] = useState('');
  const [loading, setLoading] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [cameraActive, setCameraActive] = useState(false);

  // Initialize camera scanner
  useEffect(() => {
    const html5Qrcode = new Html5Qrcode('reader');
    scannerRef.current = html5Qrcode;
    setCameraActive(true);

    const startScanner = async () => {
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (cameras && cameras.length > 0) {
          const cameraId = cameras[0].id; // Primary camera
          await html5Qrcode.start(
            cameraId,
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
            },
            (decodedText) => {
              // Successfully read QR code
              handleProcessToken(decodedText);
            },
            (errorMessage) => {
              // Verbose scan failures (can ignore)
            }
          );
        } else {
          setScanError('No cameras found. Please use the manual input below.');
          setCameraActive(false);
        }
      } catch (err) {
        console.warn('Camera initiation failed:', err);
        setScanError('Camera access denied or unavailable. Please use the manual input below.');
        setCameraActive(false);
      }
    };

    startScanner();

    // Cleanup: Stop scanning on unmount
    return () => {
      if (html5Qrcode && html5Qrcode.isScanning) {
        html5Qrcode.stop().catch(err => console.error('Failed to stop camera scanner on unmount', err));
      }
    };
  }, []);

  const handleProcessToken = async (token) => {
    if (!token) return;
    setLoading(true);
    setScanError('');

    // Stop scanner if active
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        setCameraActive(false);
      } catch (err) {
        console.error('Failed to stop scanner', err);
      }
    }

    try {
      // API call to initiate transaction
      const res = await api.payments.initiateFromQr(token);
      const { orderId } = res.data;
      
      // Navigate to payment preview page
      navigate(`/customer/payment-preview/${orderId}`);
    } catch (err) {
      setScanError(err.message || 'Verification failed. QR code may be invalid or expired.');
      setLoading(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualToken.trim()) {
      handleProcessToken(manualToken.trim());
    }
  };

  const handleRestartScanner = async () => {
    setScanError('');
    setManualToken('');
    setLoading(false);

    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        
        const cameras = await Html5Qrcode.getCameras();
        if (cameras && cameras.length > 0) {
          await scannerRef.current.start(
            cameras[0].id,
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
            },
            (decodedText) => handleProcessToken(decodedText),
            () => {}
          );
          setCameraActive(true);
        }
      } catch (err) {
        setScanError('Could not restart camera.');
        setCameraActive(false);
      }
    }
  };

  return (
    <div className="mobile-viewport min-h-screen pb-24 flex flex-col justify-between">
      {/* Header */}
      <div className="px-6 pt-8 pb-4 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white"
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-slate-100">Scan merchant QR</h1>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col justify-center items-center px-6">
        
        {/* Scanner Viewport */}
        <div className="w-full max-w-[320px] aspect-square rounded-3xl overflow-hidden glass border border-slate-850/60 shadow-premium relative flex items-center justify-center mb-6">
          <div id="reader" className="w-full h-full" />
          
          {/* Scanning Box overlay UI lines */}
          {cameraActive && !scanError && !loading && (
            <div className="absolute inset-0 border-2 border-brand/50 rounded-3xl pointer-events-none flex items-center justify-center">
              <div className="w-[200px] h-[200px] border-2 border-brand-light border-dashed rounded-xl animate-pulse" />
              {/* Scan effect beam */}
              <div className="absolute top-1/4 left-1/12 right-1/12 h-1 bg-gradient-to-r from-transparent via-brand-light to-transparent animate-bounce" />
            </div>
          )}

          {/* Loading Overlay */}
          {loading && (
            <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center z-20">
              <RefreshCw className="w-8 h-8 text-brand-light animate-spin mb-2" />
              <span className="text-xs text-slate-400">Verifying code...</span>
            </div>
          )}

          {/* Error Display */}
          {scanError && (
            <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center z-20">
              <AlertTriangle className="w-12 h-12 text-red-500 mb-3" />
              <h4 className="text-sm font-bold text-slate-200">Scan Failed</h4>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{scanError}</p>
              <button
                onClick={handleRestartScanner}
                className="mt-4 flex items-center gap-1.5 px-4 py-2 bg-brand text-white text-xs font-bold rounded-xl shadow-premium hover:bg-purple-700"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Scan Again
              </button>
            </div>
          )}
        </div>

        {/* Manual Input Fallback */}
        <div className="w-full max-w-[320px]">
          <div className="text-center text-xs text-slate-500 mb-4 font-semibold uppercase tracking-widest">
            OR paste token manually
          </div>
          
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder="Paste secure QR token..."
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-brand-light"
            />
            <button
              type="submit"
              disabled={loading || !manualToken.trim()}
              className="w-12 h-12 rounded-xl bg-brand text-white flex items-center justify-center hover:bg-purple-700 disabled:opacity-50 transition-colors"
              aria-label="Submit manual token"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Demo Token Simulator Quick-helper */}
        <div className="mt-8 p-4 w-full glass rounded-2xl border border-slate-800/40 text-xs text-slate-400">
          <h4 className="font-bold text-slate-300 mb-1 flex items-center gap-1">
            <QrCode className="w-3.5 h-3.5 text-brand-light" />
            Developer sandbox tip:
          </h4>
          <p className="leading-relaxed text-[11px]">
            To pay a bill, first log in as a <strong>Merchant</strong>, enter an amount to generate a QR, and either copy its token or scan the code here using this page!
          </p>
        </div>

      </div>

      <BottomNav />
    </div>
  );
}
