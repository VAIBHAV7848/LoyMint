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
      <div className="mobile-viewport min-h-screen bg-slate-950 text-white p-6 flex flex-col justify-between items-center text-center font-sans">
        <div className="flex-1 w-full flex flex-col justify-center items-center py-6 space-y-6">
          {/* Animated Success Badge */}
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl animate-pulse" />
            <div className="w-20 h-20 rounded-full bg-slate-900 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 relative z-10 shadow-lg shadow-emerald-500/10">
              <CheckCircle className="w-12 h-12 stroke-[2.5] animate-bounce" />
            </div>
          </div>
          
          <div className="space-y-1">
            <h2 className="text-2xl font-extrabold text-white tracking-tight">Payment Successful!</h2>
            <p className="text-xs text-slate-400 font-medium">
              Receipt ID: <span className="font-mono text-slate-300">{successTxn.order_id}</span>
            </p>
          </div>

          {/* Points Earned Banner */}
          {successTxn.reward_points_earned > 0 && (
            <div className="w-full max-w-[320px] bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex flex-col items-center space-y-1.5 shadow-inner">
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold uppercase tracking-widest">
                <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" style={{ animationDuration: '3s' }} />
                <span>Rewards Earned</span>
              </div>
              <h3 className="text-3xl font-black text-emerald-400 font-mono tracking-tight">
                +{successTxn.reward_points_earned} PTS
              </h3>
              <p className="text-[10px] text-emerald-500/80 font-medium">
                Added directly to your LoyMint wallet
              </p>
            </div>
          )}

          {/* Updated Balance Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-slate-900 border border-slate-800 rounded-full text-xs text-slate-300 font-semibold">
            <Gift className="w-3.5 h-3.5 text-brand" />
            <span>New Wallet Balance:</span>
            <span className="text-brand-light font-extrabold font-mono">{user?.pointsBalance || 0} PTS</span>
          </div>

          {/* Detailed Bill Info Card */}
          <div className="bg-slate-900/60 border border-slate-850 rounded-2xl p-5 w-full max-w-[320px] text-xs text-slate-400 space-y-3.5 shadow-2xl">
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-800/60">
              <span className="font-semibold">Paid To Merchant</span>
              <span className="font-extrabold text-white text-sm">{successTxn.shop_name || 'Merchant'}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span>Paid Amount</span>
              <span className="font-bold text-white text-sm">₹{parseFloat(successTxn.amount || 0).toFixed(2)}</span>
            </div>

            {successTxn.reward_points_used > 0 && (
              <div className="flex justify-between items-center">
                <span>LoyPoints Redeemed</span>
                <span className="font-bold text-brand-light">-{successTxn.reward_points_used} PTS</span>
              </div>
            )}

            <div className="flex justify-between items-center">
              <span>Settlement Suffix</span>
              <span className="font-mono text-slate-300">
                {successTxn.status === 'reward_paid' ? '100% Points Redeemed' : 'Points + Direct UPI'}
              </span>
            </div>

            <div className="flex justify-between items-center pt-2.5 border-t border-slate-800/60 text-[10px] text-slate-500">
              <span>Transaction Time</span>
              <span>{new Date(successTxn.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        </div>

        {/* Dynamic Action Buttons */}
        <div className="w-full max-w-[320px] space-y-2.5 pt-4">
          <button
            onClick={() => navigate('/customer/dashboard')}
            className="w-full bg-gradient-to-r from-brand to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white rounded-xl py-3.5 text-xs font-extrabold shadow-premium transition-all"
          >
            Back to Dashboard
          </button>
          
          <button
            onClick={() => navigate('/customer/rewards')}
            className="w-full bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-350 py-3 rounded-xl text-xs font-bold transition-all"
          >
            View Points Ledger
          </button>
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
