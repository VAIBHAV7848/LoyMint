import React, { useState, useEffect } from 'react';
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
  const upiId = searchParams.get('upiId') || 'naikomkar106-1@okhdfcbank';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [utr, setUtr] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(shopName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(orderId)}`;
  
  // Custom styled QR code from public api
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=8b5cf6&bgcolor=0f172a&data=${encodeURIComponent(upiUrl)}`;

  useEffect(() => {
    if (isMobile) {
      // Auto-trigger deep link on mobile devices
      const timer = setTimeout(() => {
        window.location.href = upiUrl;
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [isMobile, upiUrl]);

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
    setLoading(true);
    setError('');

    try {
      // Verify payment with server
      await api.payments.completeMockPayment(orderId, true);
      
      setLoading(false);
      setPaymentSuccess(true);
      playSuccessSound();

      // Automatically redirect back to LoyMint after 2.5 seconds
      setTimeout(() => {
        navigate(`/customer/payment-preview/${orderId}?status=success`);
      }, 2500);
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Verification failed. Please try again.');
    }
  };

  const handleLaunchUpi = () => {
    window.location.href = upiUrl;
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
                  <Smartphone className="w-3.5 h-3.5 animate-bounce" />
                  <span>Redirecting to your payment app...</span>
                </div>
                <button
                  onClick={handleLaunchUpi}
                  className="w-full bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 py-3 rounded-xl text-xs font-bold transition-all"
                >
                  Pay via installed UPI App
                </button>
              </div>
            )}

            {/* UTR Input & Complete Button */}
            <div className="w-full max-w-[280px] space-y-3.5 pt-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  UTR / UPI Ref No. (Optional)
                </label>
                <input
                  type="text"
                  maxLength="12"
                  placeholder="e.g. 340985210984"
                  value={utr}
                  onChange={(e) => setUtr(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 text-xs text-center text-slate-200 font-mono focus:outline-none focus:border-brand-light"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={handleVerifyPayment}
                disabled={loading}
                className="w-full bg-gradient-to-r from-brand to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white rounded-xl py-3.5 text-xs font-extrabold shadow-premium transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Transfer...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>I Have Paid - Verify & Confirm</span>
                  </>
                )}
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
