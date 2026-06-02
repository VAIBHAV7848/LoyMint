import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../services/apiClient';
import { ChevronLeft, Gift, ShieldCheck, CreditCard, Sparkles, X, CheckCircle } from 'lucide-react';
import BottomNav from '../../components/ui/BottomNav';

export default function PaymentPreviewPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, checkAuth } = useAuthStore();

  const [order, setOrder] = useState(null);
  const [applyRewards, setApplyRewards] = useState(false);
  const [calculation, setCalculation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  
  // Success Screen State
  const [successTxn, setSuccessTxn] = useState(null);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        setLoading(true);
        
        // Check if redirecting back after successful UPI payment
        const statusParam = searchParams.get('status');
        if (statusParam === 'success') {
          const txnRes = await api.payments.getTransactionDetails(orderId);
          setSuccessTxn(txnRes.data.transaction);
          await checkAuth(); // refresh wallet
          setLoading(false);
          return;
        }

        const previewRes = await api.payments.getRewardPreview(orderId, false);
        setCalculation(previewRes.data);
        
        setOrder({
          orderId,
          shopName: previewRes.data.shopName || 'Local Shop',
          amount: previewRes.data.remainingUpi,
          redeemRate: previewRes.data.redeemRate || 10,
          upiId: previewRes.data.upiId || '7349417848@ybl'
        });
      } catch (err) {
        setError(err.message || 'Failed to fetch bill details. Bill may have expired.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId]);

  // Recalculate when toggle changes
  useEffect(() => {
    if (!orderId) return;
    const recalculate = async () => {
      try {
        const previewRes = await api.payments.getRewardPreview(orderId, applyRewards);
        setCalculation(previewRes.data);
      } catch (err) {
        console.error('Failed to preview rewards:', err);
      }
    };
    recalculate();
  }, [applyRewards, orderId]);

  const handleProcessPayment = async () => {
    setProcessing(true);
    setError('');

    try {
      if (calculation.paymentMode === 'full_reward') {
        // Direct 100% Points Redeemed Checkout
        const res = await api.payments.payWithRewards(orderId, calculation.pointsToRedeem);
        setSuccessTxn(res.data.transaction);
        await checkAuth(); // Refresh user wallet points
      } else {
        // UPI Portion exists (Normal or Partial Checkout)
        // Call backend to reserve points and get Razorpay order parameters
        await api.payments.createOrder(orderId, calculation.pointsToRedeem);
        
        // Redirect browser to our simulated UPI Payment App
        navigate(`/customer/upi-payment-app?orderId=${orderId}&amount=${calculation.remainingUpi}&shopName=${encodeURIComponent(order.shopName)}&points=${calculation.pointsToRedeem}&upiId=${encodeURIComponent(order.upiId)}`);
      }
    } catch (err) {
      setError(err.message || 'Payment initiation failed.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="mobile-viewport min-h-screen flex items-center justify-center text-slate-500">
        Loading checkout details...
      </div>
    );
  }

  if (successTxn) {
    return (
      <div className="mobile-viewport min-h-screen bg-slate-950 text-white p-6 flex flex-col justify-between items-center text-center font-sans relative overflow-hidden">
        {/* Background page details (faded layout behind modal) */}
        <div className="w-full opacity-10 pointer-events-none filter blur-[2px] flex flex-col space-y-6 flex-1 justify-center items-center">
          <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center" />
          <div className="h-6 w-32 bg-slate-900 rounded-lg" />
          <div className="h-20 w-full bg-slate-900 rounded-2xl" />
        </div>

        {/* Real-world Pop-up Modal Overlay */}
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6 z-50">
          <div className="w-full max-w-[320px] bg-slate-900/90 border border-slate-800/80 rounded-3xl p-6 shadow-2xl space-y-6 relative overflow-hidden animate-slide-up">
            {/* Ambient glows */}
            <div className="absolute -top-12 -left-12 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -right-12 w-28 h-28 bg-violet-500/10 rounded-full blur-2xl pointer-events-none" />

            {/* Pulsing check circle */}
            <div className="flex justify-center pt-2">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-emerald-500/30 scale-150 animate-ping opacity-70" style={{ animationDuration: '2s' }} />
                <div className="absolute inset-0 rounded-full bg-emerald-500/20 scale-125 animate-pulse" />
                <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center text-white relative z-10 shadow-lg shadow-emerald-500/20">
                  <CheckCircle className="w-9 h-9 stroke-[3]" />
                </div>
              </div>
            </div>

            {/* Success Headers */}
            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-white">Payment Successful</h3>
              <p className="text-xs text-slate-400">Paid to <span className="text-slate-200 font-bold">{successTxn.shop_name || 'Merchant'}</span></p>
            </div>

            {/* Amount and Points */}
            <div className="bg-slate-950/80 border border-slate-850/60 rounded-2xl p-4 space-y-3 shadow-inner">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Amount Paid</span>
                <span className="text-white font-extrabold font-mono text-sm">₹{parseFloat(successTxn.amount || 0).toFixed(2)}</span>
              </div>
              
              {successTxn.reward_points_earned > 0 && (
                <div className="flex justify-between items-center pt-2.5 border-t border-slate-900">
                  <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    Points Earned
                  </span>
                  <span className="text-emerald-400 font-black font-mono">+{successTxn.reward_points_earned} PTS</span>
                </div>
              )}
            </div>

            {/* New Points Balance */}
            <div className="text-[11px] text-slate-400 font-medium">
              New Wallet Balance: <span className="text-brand-light font-extrabold font-mono">{user?.pointsBalance || 0} PTS</span>
            </div>

            {/* Action CTAs */}
            <div className="space-y-2 pt-2">
              <button
                onClick={() => navigate('/customer/dashboard')}
                className="w-full bg-gradient-to-r from-brand to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white rounded-xl py-3 text-xs font-extrabold shadow-premium transition-all flex items-center justify-center gap-1.5"
              >
                <span>Go to Dashboard</span>
              </button>
              <button
                onClick={() => navigate('/customer/rewards')}
                className="w-full bg-slate-950 border border-slate-800 hover:bg-slate-850 text-slate-400 py-2.5 rounded-xl text-xs font-semibold transition-all"
              >
                View Points Ledger
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
        <h1 className="text-xl font-bold text-slate-100">Confirm Payment</h1>
      </div>

      {/* Details content */}
      <div className="flex-1 px-6 py-4 flex flex-col justify-between">
        
        {/* Bill Info Card */}
        <div>
          <div className="glass-card rounded-3xl p-6 border border-slate-800/60 shadow-xl mb-6 text-center">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Paying to</span>
            <h2 className="text-xl font-bold text-white mt-1 mb-3">{order?.shopName || 'Local Hotspot'}</h2>
            
            <span className="text-3xl font-extrabold tracking-tight text-white block">
              ₹{order?.amount}
            </span>
          </div>

          {/* Points toggle */}
          {user?.pointsBalance > 0 && (
            <div className="glass rounded-2xl p-4 border border-slate-800/40 flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-brand-light flex items-center justify-center border border-purple-500/20">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-semibold">Apply LoyMint Points</span>
                  <span className="text-[11px] text-slate-500">Balance: {user.pointsBalance} PTS</span>
                </div>
              </div>
              
              <input
                type="checkbox"
                checked={applyRewards}
                onChange={() => setApplyRewards(!applyRewards)}
                className="w-5 h-5 accent-brand rounded cursor-pointer"
              />
            </div>
          )}

          {/* Ledger calculations */}
          {calculation && (
            <div className="space-y-3.5 p-4 rounded-2xl bg-slate-900/40 border border-slate-800/40 text-sm text-slate-400">
              <div className="flex justify-between">
                <span>Original Bill</span>
                <span className="text-slate-200">₹{order?.amount}</span>
              </div>
              {calculation.rewardDiscount > 0 && (
                <div className="flex justify-between text-brand-light font-medium">
                  <span className="flex items-center gap-1">
                    Points Discount ({calculation.pointsToRedeem} pts)
                  </span>
                  <span>-₹{calculation.rewardDiscount}</span>
                </div>
              )}
              <div className="border-t border-slate-850 pt-3 flex justify-between font-bold text-slate-100">
                <span>Net Payable</span>
                <span className="text-brand-light">₹{calculation.remainingUpi}</span>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs mt-4">
              {error}
            </div>
          )}
        </div>

        {/* Process button */}
        <button
          onClick={handleProcessPayment}
          disabled={processing}
          className="w-full bg-gradient-to-r from-brand to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white rounded-xl py-3.5 text-sm font-bold shadow-premium transition-all mt-6 disabled:opacity-50"
        >
          {processing ? 'Processing...' : calculation?.paymentMode === 'full_reward' ? 'Redeem and Pay Full' : 'Pay via UPI'}
        </button>

      </div>

      <BottomNav />
    </div>
  );
}
