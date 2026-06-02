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
      <div className="mobile-viewport min-h-screen p-6 flex flex-col justify-between items-center text-center">
        <div className="flex-1 flex flex-col justify-center items-center">
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 mb-6">
            <CheckCircle className="w-12 h-12" />
          </div>
          
          <h2 className="text-2xl font-extrabold text-white">Payment Successful!</h2>
          <p className="text-xs text-slate-400 mt-1.5 uppercase tracking-wider font-semibold">
            Receipt: {successTxn.order_id}
          </p>

          <div className="glass-card rounded-2xl p-5 border border-slate-800/40 w-full max-w-[320px] mt-8 text-sm text-slate-300 space-y-3">
            <div className="flex justify-between">
              <span>Paid Amount</span>
              <span className="font-bold text-white">₹{successTxn.amount}</span>
            </div>
            {successTxn.reward_points_used > 0 && (
              <div className="flex justify-between text-brand-light">
                <span>Points Redeemed</span>
                <span>-{successTxn.reward_points_used} PTS</span>
              </div>
            )}
            <div className="border-t border-slate-800/60 pt-3 flex justify-between text-xs text-slate-400">
              <span>Payment Mode</span>
              <span>
                {successTxn.status === 'reward_paid' ? '100% Points' : 'Points + UPI'}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate('/customer/dashboard')}
          className="w-full bg-brand text-white rounded-xl py-3.5 text-sm font-bold shadow-premium"
        >
          Back to Home
        </button>
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
