import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/apiClient';
import { ShieldCheck, ArrowLeft, Landmark, Check, AlertCircle, Loader2 } from 'lucide-react';

export default function UpiPaymentAppPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const orderId = searchParams.get('orderId');
  const amount = searchParams.get('amount') || '0';
  const shopName = searchParams.get('shopName') || 'Merchant';
  const points = searchParams.get('points') || '0';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // PIN entry states
  const [showPinScreen, setShowPinScreen] = useState(false);
  const [pin, setPin] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Play a beautiful payment success sound using Web Audio API!
  const playSuccessSound = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      // Tone 1: C5
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.value = 523.25; // C5
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      
      // Tone 2: E5
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

  const handleKeyClick = (value) => {
    if (pin.length < 6) {
      setPin(prev => prev + value);
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handleSubmitPin = async () => {
    if (pin.length < 4) {
      setError('Please enter a valid 4 or 6-digit UPI PIN.');
      return;
    }
    
    setError('');
    setProcessingPayment(true);

    try {
      // API call to mock complete the transaction on server (which does the balance logic)
      await api.payments.completeMockPayment(orderId, true);
      
      setProcessingPayment(false);
      setPaymentSuccess(true);
      playSuccessSound();

      // Automatically redirect back to LoyMint after 2.5 seconds
      setTimeout(() => {
        navigate(`/customer/payment-preview/${orderId}?status=success`);
      }, 2500);
    } catch (err) {
      setProcessingPayment(false);
      setError(err.message || 'Payment authentication failed. Try again.');
      setPin('');
    }
  };

  return (
    <div className="mobile-viewport min-h-screen bg-slate-950 text-white flex flex-col justify-between font-sans">
      
      {/* 1. MAIN PAYMENT INITIATION SCREEN */}
      {!showPinScreen && (
        <>
          {/* Header */}
          <div className="px-6 pt-8 pb-4 flex items-center gap-4 border-b border-slate-900/60 bg-slate-950/80 sticky top-0 backdrop-blur-md z-10">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-slate-300 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-sm font-semibold text-slate-400">Secure UPI Gateway</h1>
              <p className="text-xs text-slate-500">Payee ID: {orderId?.substring(0, 15)}...</p>
            </div>
          </div>

          {/* Payee Info */}
          <div className="flex-1 px-6 py-10 flex flex-col items-center justify-center space-y-6">
            {/* Merchant Avatar */}
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-brand to-violet-600 flex items-center justify-center text-3xl font-extrabold text-white shadow-lg border-2 border-slate-800">
              {shopName.charAt(0).toUpperCase()}
            </div>

            {/* Payee Details */}
            <div className="text-center space-y-1.5">
              <p className="text-xs font-bold text-brand-light uppercase tracking-widest">Paying to</p>
              <h2 className="text-2xl font-extrabold text-white">{shopName}</h2>
              <p className="text-xs text-slate-500 font-mono">UPI ID: {shopName.toLowerCase().replace(/[^a-z0-9]/g, '')}@upi</p>
            </div>

            {/* Amount */}
            <div className="text-center py-4">
              <span className="text-4xl font-extrabold tracking-tight text-white">
                ₹{parseFloat(amount).toFixed(2)}
              </span>
              {parseFloat(points) > 0 && (
                <p className="text-xs text-emerald-400 font-medium mt-1">
                  (LoyMint Discount Applied: {points} PTS)
                </p>
              )}
            </div>

            {/* Bank Card Selection */}
            <div className="w-full max-w-[320px] bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-600/10 text-violet-400 flex items-center justify-center border border-violet-600/20">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">HDFC Bank Secondary</h4>
                  <p className="text-[10px] text-slate-500">Savings Account •••• 9821</p>
                </div>
              </div>
              <span className="text-[10px] bg-brand/10 border border-brand/20 text-brand-light font-bold px-2 py-0.5 rounded-full">
                DEFAULT
              </span>
            </div>
            
            {error && (
              <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-2 max-w-[320px]">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Secure CTA */}
          <div className="p-6 border-t border-slate-900 bg-slate-950/90 backdrop-blur-md">
            <button
              onClick={() => setShowPinScreen(true)}
              className="w-full bg-gradient-to-r from-brand to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white rounded-2xl py-4 text-sm font-extrabold shadow-premium transition-all flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              Pay ₹{parseFloat(amount).toFixed(2)} Securely
            </button>
            <p className="text-[10px] text-center text-slate-600 mt-3">
              UPI transactions are secured using 256-bit bank-grade encryption.
            </p>
          </div>
        </>
      )}

      {/* 2. SECURE UPI PIN KEYPAD OVERLAY SCREEN */}
      {showPinScreen && (
        <div className="flex-1 flex flex-col justify-between bg-slate-950">
          
          {/* Header */}
          <div className="px-6 pt-8 pb-4 flex justify-between items-center border-b border-slate-900">
            <div className="flex items-center gap-2 text-slate-350">
              <Landmark className="w-4 h-4" />
              <span className="text-xs font-semibold">HDFC BANK</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 block">AMOUNT</span>
              <span className="text-sm font-bold text-white">₹{parseFloat(amount).toFixed(2)}</span>
            </div>
          </div>

          {/* Main PIN Center */}
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
            {processingPayment ? (
              <div className="flex flex-col items-center space-y-4">
                <Loader2 className="w-12 h-12 text-brand animate-spin" />
                <p className="text-xs text-slate-400 font-semibold animate-pulse">
                  Authorizing payment with bank...
                </p>
              </div>
            ) : paymentSuccess ? (
              <div className="flex flex-col items-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center text-white animate-bounce shadow-lg shadow-emerald-500/20">
                  <Check className="w-10 h-10 stroke-[3]" />
                </div>
                <h3 className="text-lg font-bold text-white">UPI Payment Approved</h3>
                <p className="text-xs text-slate-500">Redirecting back to LoyMint...</p>
              </div>
            ) : (
              <div className="w-full max-w-[280px] text-center space-y-8">
                <div>
                  <h3 className="text-sm font-bold text-slate-300">ENTER 4-DIGIT UPI PIN</h3>
                  <p className="text-[11px] text-slate-500 mt-1">To verify you own this bank account</p>
                </div>

                {/* PIN Dots */}
                <div className="flex justify-center gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-4.5 h-4.5 rounded-full border-2 transition-all ${
                        pin.length > i 
                          ? 'bg-white border-white scale-110 shadow-sm' 
                          : 'border-slate-800 bg-transparent'
                      }`}
                    />
                  ))}
                </div>

                {error && (
                  <p className="text-xs text-red-400 font-semibold">{error}</p>
                )}
              </div>
            )}
          </div>

          {/* Keypad */}
          {!processingPayment && !paymentSuccess && (
            <div className="bg-slate-900/60 border-t border-slate-900 pb-8 pt-4">
              <div className="grid grid-cols-3 gap-y-3.5 max-w-[320px] mx-auto text-center">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                  <button
                    key={num}
                    onClick={() => handleKeyClick(num.toString())}
                    className="py-4 text-xl font-bold text-white hover:bg-slate-800/40 rounded-full active:scale-95 transition-transform"
                  >
                    {num}
                  </button>
                ))}
                
                {/* Backspace */}
                <button
                  onClick={handleBackspace}
                  className="py-4 text-sm font-bold text-slate-400 hover:text-white hover:bg-slate-800/40 rounded-full active:scale-95 transition-transform"
                >
                  CLEAR
                </button>
                
                {/* Zero */}
                <button
                  onClick={() => handleKeyClick('0')}
                  className="py-4 text-xl font-bold text-white hover:bg-slate-800/40 rounded-full active:scale-95 transition-transform"
                >
                  0
                </button>

                {/* Submit */}
                <button
                  onClick={handleSubmitPin}
                  className="py-4 text-sm font-bold text-emerald-400 hover:text-emerald-300 hover:bg-slate-850 rounded-full active:scale-95 transition-transform"
                >
                  SUBMIT
                </button>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
