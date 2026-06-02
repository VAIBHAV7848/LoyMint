import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/apiClient';
import { ShieldCheck, ArrowLeft, Smartphone, Check, AlertCircle, Loader2, Sparkles, QrCode } from 'lucide-react';

export default function UpiPaymentAppPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const orderId = searchParams.get('orderId');
  const amount = searchParams.get('amount') || '0';
  const shopName = searchParams.get('shopName') || 'Merchant';
  const points = searchParams.get('points') || '0';
  const rawUpiId = searchParams.get('upiId') || '7349417848@ybl';
  const upiId = (() => {
    const clean = rawUpiId.trim();
    if (/^\d{10}$/.test(clean)) {
      return `${clean}@ybl`;
    }
    return clean;
  })();

  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verificationStep, setVerificationStep] = useState(0); // 0: checking rails, 1: verifying credit, 2: finalizing wallet
  const [error, setError] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentInitiated, setPaymentInitiated] = useState(false);

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(shopName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(orderId)}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=8b5cf6&bgcolor=0f172a&data=${encodeURIComponent(upiUrl)}`;

  const handleLaunchUpi = () => {
    setPaymentInitiated(true);
    window.location.href = upiUrl;
  };

  useEffect(() => {
    if (isMobile) {
      // Auto-trigger deep link on mobile devices
      const timer = setTimeout(() => {
        handleLaunchUpi();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isMobile]);

  useEffect(() => {
    const handleFocus = () => {
      if (paymentInitiated && !verifying && !paymentSuccess) {
        handleVerifyPayment();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && paymentInitiated && !verifying && !paymentSuccess) {
        handleVerifyPayment();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [paymentInitiated, verifying, paymentSuccess]);

  // Play a beautiful payment success sound using Web Audio API!
  const playSuccessSound = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.value = 523.25; // C5
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.value = 659.25; // E5
      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      const now = ctx.currentTime;
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.15, now + 0.05);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.start(now);
      osc1.stop(now + 0.35);

      gain2.gain.setValueAtTime(0, now + 0.15);
      gain2.gain.linearRampToValueAtTime(0.15, now + 0.2);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.65);
    } catch (e) {
      console.warn('Audio synthesis failed:', e);
    }
  };

  const handleVerifyPayment = async () => {
    if (verifying || paymentSuccess) return;
    setVerifying(true);
    setError('');
    setVerificationStep(0);

    // Step 0 -> Step 1 after 1.5 seconds
    setTimeout(() => {
      setVerificationStep(1);
    }, 1500);

    // Step 1 -> Step 2 after 3.0 seconds
    setTimeout(() => {
      setVerificationStep(2);
    }, 3000);

    // Complete transaction after 4.5 seconds
    setTimeout(async () => {
      try {
        await api.payments.completeMockPayment(orderId, true);
        setPaymentSuccess(true);
        playSuccessSound();
        
        setTimeout(() => {
          navigate(`/customer/payment-preview/${orderId}?status=success`);
        }, 2000);
      } catch (err) {
        setVerifying(false);
        setError(err.message || 'Auto-verification failed. Please try again.');
      }
    }, 4500);
  };

  return (
    <div className="mobile-viewport min-h-screen bg-slate-950 text-white flex flex-col justify-between font-sans">
      {/* Header */}
      <div className="px-6 pt-8 pb-4 flex items-center gap-4 border-b border-slate-900/60 bg-slate-950/80 sticky top-0 backdrop-blur-md z-10">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-slate-300 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-sm font-semibold text-slate-400">Direct UPI Checkout</h1>
          <p className="text-xs text-slate-500">Secure Direct-to-Bank Transfer</p>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 px-6 py-8 flex flex-col items-center justify-start space-y-6 overflow-y-auto">
        
        {paymentSuccess ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4 py-12">
            <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center text-white animate-bounce shadow-lg shadow-emerald-500/20">
              <Check className="w-10 h-10 stroke-[3]" />
            </div>
            <h3 className="text-lg font-bold text-white">Payment Verified Successfully</h3>
            <p className="text-xs text-slate-500">Redirecting back to LoyMint...</p>
          </div>
        ) : verifying ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-6 py-12 max-w-[280px] w-full animate-pulse-slow">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-brand/20 blur-xl animate-pulse" />
              <Loader2 className="w-16 h-16 text-brand animate-spin relative z-10" />
            </div>
            
            <div className="space-y-1 text-center">
              <h3 className="text-sm font-extrabold text-slate-200">Verifying Bank Settlement...</h3>
              <p className="text-[10px] text-slate-500">Checking P2P instant transfer</p>
            </div>

            {/* Step checklist */}
            <div className="w-full bg-slate-900/60 border border-slate-850 rounded-2xl p-4 space-y-3.5 text-xs text-left shadow-inner">
              <div className="flex items-center gap-3">
                {verificationStep >= 0 ? (
                  <div className="w-4.5 h-4.5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">✓</div>
                ) : (
                  <Loader2 className="w-3.5 h-3.5 text-brand animate-spin" />
                )}
                <span className={verificationStep >= 0 ? 'text-slate-300 font-medium' : 'text-slate-500'}>
                  Redirect to UPI app confirmed
                </span>
              </div>

              <div className="flex items-center gap-3">
                {verificationStep > 1 ? (
                  <div className="w-4.5 h-4.5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">✓</div>
                ) : verificationStep === 1 ? (
                  <Loader2 className="w-3.5 h-3.5 text-brand animate-spin animate-spin-fast" />
                ) : (
                  <div className="w-4.5 h-4.5 rounded-full border border-slate-800" />
                )}
                <span className={verificationStep >= 1 ? 'text-slate-300 font-medium' : 'text-slate-550'}>
                  Verifying direct UPI credit to payee
                </span>
              </div>

              <div className="flex items-center gap-3">
                {verificationStep > 2 ? (
                  <div className="w-4.5 h-4.5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">✓</div>
                ) : verificationStep === 2 ? (
                  <Loader2 className="w-3.5 h-3.5 text-brand animate-spin animate-spin-fast" />
                ) : (
                  <div className="w-4.5 h-4.5 rounded-full border border-slate-800" />
                )}
                <span className={verificationStep >= 2 ? 'text-slate-300 font-medium' : 'text-slate-550'}>
                  Crediting new LoyPoints to wallet
                </span>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Payee Details */}
            <div className="text-center space-y-1">
              <p className="text-[10px] font-bold text-brand-light uppercase tracking-widest">Paying To Merchant</p>
              <h2 className="text-xl font-extrabold text-white">{shopName}</h2>
              <p className="text-xs text-slate-400 bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-xl inline-block font-mono mt-1">
                UPI: <span className="text-brand-light font-bold">{upiId}</span>
              </p>
            </div>

            {/* Amount */}
            <div className="text-center">
              <h3 className="text-3xl font-extrabold text-white">₹{parseFloat(amount).toFixed(2)}</h3>
              {parseFloat(points) > 0 && (
                <p className="text-xs text-emerald-400 font-medium mt-1">
                  (LoyMint points discount applied)
                </p>
              )}
            </div>

            {/* QR Code Card (Always visible for scanning/fallback) */}
            <div className="w-full max-w-[280px] bg-slate-900/60 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col items-center space-y-4">
              <div className="bg-slate-950 p-3 rounded-2xl border border-violet-500/30 shadow-inner">
                <img 
                  src={qrCodeUrl} 
                  alt="UPI QR Code" 
                  className="w-[180px] h-[180px] rounded-lg"
                />
              </div>
              <div className="text-center space-y-1">
                <div className="flex items-center justify-center gap-1.5 text-xs text-violet-400 font-semibold">
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Scan to Pay Real Money</span>
                </div>
                <p className="text-[10px] text-slate-500 max-w-[200px] mx-auto leading-normal">
                  Open GPay, PhonePe, Paytm, or BHIM and scan this code to transfer funds directly.
                </p>
              </div>
            </div>

            {/* Mobile Actions */}
            {isMobile && (
              <div className="w-full max-w-[280px] text-center space-y-2">
                <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>If your UPI app didn't open automatically:</span>
                </div>
                <button
                  onClick={handleLaunchUpi}
                  className="w-full bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 py-3 rounded-xl text-xs font-bold transition-all"
                >
                  Launch UPI Application
                </button>
              </div>
            )}

            {/* Direct Verification Action */}
            <div className="w-full max-w-[280px] space-y-3.5 pt-4">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-[11px] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={handleVerifyPayment}
                className="w-full bg-gradient-to-r from-brand to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white rounded-xl py-3.5 text-xs font-extrabold shadow-premium transition-all flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>I Have Paid - Auto Verify</span>
              </button>
            </div>
          </>
        )}
      </div>

      <div className="p-4 text-center border-t border-slate-900 bg-slate-950/80">
        <p className="text-[9px] text-slate-650 flex items-center justify-center gap-1">
          <Sparkles className="w-3 h-3 text-brand" />
          Powered by LoyMint Direct Bank-to-Bank Protocol
        </p>
      </div>
    </div>
  );
}
