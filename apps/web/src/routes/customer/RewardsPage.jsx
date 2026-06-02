import React, { useEffect, useState } from 'react';
import { api } from '../../services/apiClient';
import OfferCard from '../../components/loyalty/OfferCard';
import TransactionRow from '../../components/loyalty/TransactionRow';
import { Gift, Calendar, Award, BookOpen } from 'lucide-react';
import BottomNav from '../../components/ui/BottomNav';

export default function RewardsPage() {
  const [activeTab, setActiveTab] = useState('saved'); // 'saved' or 'ledger'
  const [savedOffers, setSavedOffers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [pointsLog, setPointsLog] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch saved offers
      const savedRes = await api.user.getSavedOffers();
      setSavedOffers(savedRes.data.offers || []);

      // Fetch transaction history
      const txRes = await api.user.getTransactions();
      setTransactions(txRes.data.transactions || []);

      // Fetch points log
      const logsRes = await api.user.getPointsLog();
      setPointsLog(logsRes.data.logs || []);
    } catch (err) {
      console.error('Failed to fetch rewards details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUnsaveOffer = async (offerId) => {
    try {
      await api.user.unsaveOffer(offerId);
      setSavedOffers(savedOffers.filter(o => o.id !== offerId));
    } catch (err) {
      console.error('Failed to unsave offer:', err);
    }
  };

  // Calculate total points redeemed / earned
  const totalEarned = pointsLog
    .filter(l => l.points_change > 0)
    .reduce((sum, l) => sum + parseInt(l.points_change, 10), 0);

  const totalRedeemed = pointsLog
    .filter(l => l.points_change < 0)
    .reduce((sum, l) => sum + Math.abs(parseInt(l.points_change, 10)), 0);

  return (
    <div className="mobile-viewport min-h-screen pb-24">
      {/* Title Header */}
      <div className="px-6 pt-8 pb-4">
        <h1 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2">
          <Award className="w-6 h-6 text-brand-light" />
          Loyalty Rewards
        </h1>
      </div>

      {/* Rewards Metrics Panel */}
      <div className="px-6 mb-6">
        <div className="glass-premium rounded-3xl p-5 border border-purple-500/10 flex gap-4 text-center">
          <div className="flex-1">
            <span className="text-[10px] text-purple-200 uppercase tracking-widest block font-medium">All-time Earned</span>
            <span className="text-xl font-black text-white mt-1 block">+{totalEarned} PTS</span>
          </div>
          <div className="w-px bg-purple-500/10 self-stretch" />
          <div className="flex-1">
            <span className="text-[10px] text-purple-200 uppercase tracking-widest block font-medium">Redeemed</span>
            <span className="text-xl font-black text-white mt-1 block">-{totalRedeemed} PTS</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 border-b border-slate-800/80 flex gap-6 text-sm font-semibold mb-4">
        <button
          onClick={() => setActiveTab('saved')}
          className={`pb-3 relative transition-colors ${
            activeTab === 'saved' ? 'text-brand-light font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Saved Offers ({savedOffers.length})
          {activeTab === 'saved' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-light rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('ledger')}
          className={`pb-3 relative transition-colors ${
            activeTab === 'ledger' ? 'text-brand-light font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Point Ledger History
          {activeTab === 'ledger' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-light rounded-full" />
          )}
        </button>
      </div>

      {/* Tab Panels */}
      <div className="px-6">
        {loading ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            Fetching points ledger...
          </div>
        ) : activeTab === 'saved' ? (
          savedOffers.length === 0 ? (
            <div className="p-12 text-center glass rounded-3xl border border-slate-800/40 text-slate-500 text-xs">
              No saved offers. Visit shops to find discount coupons.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {savedOffers.map((offer) => (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  isSaved={true}
                  onToggleSave={handleUnsaveOffer}
                />
              ))}
            </div>
          )
        ) : (
          /* Points ledger logs list */
          pointsLog.length === 0 ? (
            <div className="p-12 text-center glass rounded-3xl border border-slate-800/40 text-slate-500 text-xs">
              Your points history ledger is empty. Start paying at shops to earn points!
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {pointsLog.map((log) => {
                const formattedDate = new Date(log.created_at).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: '2-digit',
                });
                const isEarn = log.points_change > 0;
                
                let reasonLabel = 'Adjustment';
                if (log.reason === 'purchase') reasonLabel = 'Earned from bill';
                if (log.reason === 'reward_redeem') reasonLabel = 'Redeemed at shop';
                if (log.reason === 'referral_bonus') reasonLabel = 'Referral Bonus';

                return (
                  <div key={log.id} className="flex justify-between items-center p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/30">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                        isEarn ? 'bg-emerald-500/10 text-emerald-400' : 'bg-brand/10 text-brand-light'
                      }`}>
                        {isEarn ? '+' : '-'}
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-100 text-sm">
                          {reasonLabel}
                        </h4>
                        <span className="text-[10px] text-slate-500">{log.shop_name || 'LoyMint System'} • {formattedDate}</span>
                      </div>
                    </div>
                    <span className={`font-black text-sm ${isEarn ? 'text-emerald-400' : 'text-purple-300'}`}>
                      {isEarn ? '+' : ''}{log.points_change} PTS
                    </span>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      <BottomNav />
    </div>
  );
}
