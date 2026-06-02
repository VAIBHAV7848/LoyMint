import React from 'react';
import { ArrowUpRight, ArrowDownLeft, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

export default function TransactionRow({ tx, isMerchant = false }) {
  const formattedDate = new Date(tx.created_at).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
      case 'partial_paid':
      case 'reward_paid':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-amber-400" />;
      default:
        return <Clock className="w-4 h-4 text-slate-500" />;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'success':
        return 'Paid';
      case 'partial_paid':
        return 'Points + Paid';
      case 'reward_paid':
        return 'Points Paid';
      case 'failed':
        return 'Failed';
      case 'pending':
        return 'Pending';
      case 'expired':
        return 'Expired';
      default:
        return status;
    }
  };

  const isPointsEarning = tx.upi_paid > 0 && ['success', 'partial_paid'].includes(tx.status);

  return (
    <div className="flex justify-between items-center p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/30 hover:border-slate-800 transition-colors">
      <div className="flex items-center gap-3">
        {/* Status Indicator */}
        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
          ['success', 'partial_paid', 'reward_paid'].includes(tx.status)
            ? 'bg-emerald-500/10 text-emerald-400'
            : tx.status === 'failed'
              ? 'bg-red-500/10 text-red-500'
              : 'bg-amber-500/10 text-amber-400'
        }`}>
          {isPointsEarning ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
        </div>

        <div>
          <h4 className="font-semibold text-slate-100 text-sm">
            {isMerchant ? (tx.customer_name || 'LoyMint Customer') : tx.shop_name}
          </h4>
          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-400">
            <span>{formattedDate}</span>
            <span>•</span>
            <span className="flex items-center gap-0.5 text-[10px]">
              {getStatusIcon(tx.status)}
              {getStatusLabel(tx.status)}
            </span>
          </div>
        </div>
      </div>

      <div className="text-right">
        <span className="font-extrabold text-sm text-slate-100 block">
          ₹{tx.amount}
        </span>
        {/* Points display */}
        {tx.status === 'pending' && (
          <span className="text-[10px] text-amber-400 font-medium">Processing</span>
        )}
        {['success', 'partial_paid'].includes(tx.status) && (
          <span className="text-[10px] text-emerald-400 font-semibold">
             Used {tx.reward_points_used || 0} pts
          </span>
        )}
        {tx.status === 'reward_paid' && (
          <span className="text-[10px] text-purple-300 font-semibold">
            Redeemed {tx.reward_points_used} pts
          </span>
        )}
      </div>
    </div>
  );
}
