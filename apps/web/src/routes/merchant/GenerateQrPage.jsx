import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/apiClient';
import { ChevronLeft, QrCode, Sparkles, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';

export default function GenerateQrPage() {
  const navigate = useNavigate();

  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Active QR code state
  const [qrCodeData, setQrCodeData] = useState(null); // { orderId, qrDataUrl, expiresAt, amount }
  const [timeLeft, setTimeLeft] = useState(0);
  const [txnStatus, setTxnStatus] = useState('pending'); // 'pending', 'success', 'expired'
  const timerRef = useRef(null);

  // Generate QR
  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      setError('Please enter a valid bill amount.');
      return;
    }

    setLoading(true);
    setError('');
    setQrCodeData(null);
    setTxnStatus('pending');

    try {
      const res = await api.payments.generateQr(parseFloat(amount));
      const data = res.data;
      setQrCodeData(data);
      
      // Calculate countdown duration in seconds
      const secondsLeft = Math.max(0, Math.floor((new Date(data.expiresAt) - new Date()) / 1000));
      setTimeLeft(secondsLeft);
    } catch (err) {
      setError(err.message || 'Failed to generate QR code.');
    } finally {
      setLoading(false);
    }
  };

  // Handle countdown timer
  useEffect(() => {
    if (timeLeft <= 0) {
      if (qrCodeData && txnStatus === 'pending') {
        setTxnStatus('expired');
      }
      return;
    }

    timerRef.current = setTimeout(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);

    return () => clearTimeout(timerRef.current);
  }, [timeLeft, qrCodeData]);

  // Set up SSE Stream connection to watch status updates in real-time
  useEffect(() => {
    if (!qrCodeData?.orderId) return;

    // Fetch shop details to get the current shopId
    const loadShopAndSSE = async () => {
      try {
        const shopRes = await api.shops.getNearby(12.934, 77.624, 20);
        const myShop = shopRes.data.shops.find(s => s.is_active === true) || null;
        
        if (!myShop) return;

        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
        const eventSource = new EventSource(`${API_BASE_URL}/payment/stream?shopId=${myShop.id}`);

        eventSource.onmessage = (event) => {
          try {
            const transaction = JSON.parse(event.data);
            if (transaction.order_id === qrCodeData.orderId) {
              console.log('Realtime payment update received for current active QR:', transaction);
              
              if (['success', 'partial_paid', 'reward_paid'].includes(transaction.status)) {
                setTxnStatus('success');
                setTimeLeft(0); // Stop countdown
              } else if (transaction.status === 'failed') {
                setError('Customer payment was declined.');
              }
            }
          } catch (err) {
            console.error('Error parsing SSE event in QR page:', err);
          }
        };

        return eventSource;
      } catch (err) {
        console.error(err);
      }
    };

    let sseInstance = null;
    loadShopAndSSE().then(instance => {
      sseInstance = instance;
    });

    return () => {
      if (sseInstance) sseInstance.close();
    };
  }, [qrCodeData?.orderId]);

  const handleReset = () => {
    setQrCodeData(null);
    setAmount('');
    setTimeLeft(0);
    setTxnStatus('pending');
    setError('');
  };

  return (
    <div className="mobile-viewport min-h-screen pb-6 flex flex-col justify-between">
      
      {/* Header */}
      <div className="px-6 pt-8 pb-4 flex items-center gap-3">
        <button
          onClick={() => navigate('/merchant/dashboard')}
          className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white"
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-slate-100">Generate Bill QR</h1>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 py-4 flex flex-col justify-center items-center">
        
        {/* QR Display Area */}
        {qrCodeData ? (
          <div className="w-full max-w-[320px] glass-card rounded-3xl p-6 border border-slate-800 flex flex-col items-center text-center space-y-5">
            
            {/* Countdown Badge */}
            {txnStatus === 'pending' && (
              <div className="px-3.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full text-xs font-semibold animate-pulse flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Expires in {timeLeft}s</span>
              </div>
            )}
            {txnStatus === 'success' && (
              <div className="px-3.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-semibold flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Payment Complete</span>
              </div>
            )}
            {txnStatus === 'expired' && (
              <div className="px-3.5 py-1 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full text-xs font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>QR Expired</span>
              </div>
            )}

            {/* Bill Details */}
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Bill Amount</span>
              <h3 className="text-3xl font-extrabold text-white">₹{qrCodeData.amount}</h3>
            </div>

            {/* QR Image viewport */}
            <div className="w-48 h-48 rounded-2xl bg-white p-2 border border-slate-800 flex items-center justify-center relative overflow-hidden">
              {txnStatus === 'success' ? (
                <div className="absolute inset-0 bg-emerald-500 flex flex-col items-center justify-center text-white p-4">
                  <CheckCircle className="w-16 h-16" />
                  <span className="text-xs font-extrabold mt-2">SUCCESS</span>
                </div>
              ) : txnStatus === 'expired' ? (
                <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center text-red-400 p-4">
                  <AlertTriangle className="w-12 h-12 mb-2" />
                  <span className="text-xs font-bold">EXPIRED</span>
                </div>
              ) : null}
              <img src={qrCodeData.qrDataUrl} alt="Bill QR Code" className="w-full h-full object-contain" />
            </div>

            {/* Status updates */}
            <div className="text-xs text-slate-400 font-medium">
              {txnStatus === 'pending' && '🔴 Ready - Customer must scan code'}
              {txnStatus === 'success' && '🟢 Paid - Account credited!'}
              {txnStatus === 'expired' && '❌ Expiration limit reached.'}
            </div>

            <button
              onClick={handleReset}
              className="w-full bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 py-3 rounded-xl text-xs font-bold"
            >
              Generate New Bill
            </button>

          </div>
        ) : (
          /* Generate Form */
          <div className="w-full max-w-[320px] glass-card rounded-3xl p-6 border border-slate-800">
            <h2 className="text-base font-bold text-slate-200 mb-4 text-center">Enter Billing Amount</h2>
            
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Bill Amount (₹)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 250"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3.5 px-4 text-sm text-slate-200 focus:outline-none focus:border-brand-light"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-brand to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white rounded-xl py-3.5 text-sm font-bold shadow-premium transition-all"
              >
                {loading ? 'Generating...' : 'Generate Bill QR'}
              </button>
            </form>
          </div>
        )}

      </div>

    </div>
  );
}
