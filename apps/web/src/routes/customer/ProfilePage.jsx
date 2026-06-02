import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../services/apiClient';
import { User, Copy, Check, LogOut, RefreshCw, Smartphone, Award, Sparkles } from 'lucide-react';
import BottomNav from '../../components/ui/BottomNav';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout, checkAuth } = useAuthStore();
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCopyReferral = () => {
    if (user?.referralCode) {
      navigator.clipboard.writeText(user.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await checkAuth();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mobile-viewport min-h-screen pb-24">
      {/* Header */}
      <div className="px-6 pt-8 pb-4">
        <h1 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2">
          <User className="w-6 h-6 text-brand-light" />
          My Profile
        </h1>
      </div>

      {/* User Info Card */}
      <div className="px-6 mb-6">
        <div className="glass-card rounded-3xl p-6 border border-slate-800/40 relative">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-brand to-violet-500 flex items-center justify-center text-white font-extrabold text-lg shadow-premium">
              {user?.name?.substring(0, 2).toUpperCase() || 'US'}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">{user?.name || 'LoyMint Customer'}</h2>
              <span className="text-xs text-slate-400 block">{user?.email}</span>
              <span className="inline-block text-[10px] bg-brand/10 text-brand-light font-bold px-2 py-0.5 rounded-full mt-1.5 uppercase">
                Customer App
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Referral Code Box */}
      <div className="px-6 mb-6">
        <div className="glass rounded-3xl p-5 border border-slate-800/40 space-y-3.5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-brand-light flex items-center justify-center border border-purple-500/20 shrink-0">
              <Sparkles className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-200">Invite Friends & Earn Points</h3>
              <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                Share your referral code. You and your friend both earn <strong>50 bonus points</strong> when they complete registration!
              </p>
            </div>
          </div>

          <div className="flex gap-2 bg-slate-950 p-2.5 rounded-2xl border border-slate-900">
            <div className="flex-1 flex flex-col justify-center pl-2">
              <span className="text-[8px] text-slate-600 uppercase font-bold">YOUR REFERRAL CODE</span>
              <span className="text-sm font-black text-white tracking-widest uppercase">{user?.referralCode || 'ROHAN123'}</span>
            </div>
            
            <button
              onClick={handleCopyReferral}
              className={`px-4 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${
                copied 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                  : 'bg-brand text-white hover:bg-purple-700'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" /> Copied
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" /> Copy Code
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Account Settings / Actions */}
      <div className="px-6 space-y-3">
        {/* Refresh Wallet */}
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="w-full flex items-center justify-between p-4 bg-slate-900/40 border border-slate-800/40 rounded-2xl text-slate-300 hover:text-white hover:bg-slate-900/60 transition-all text-sm font-medium"
        >
          <div className="flex items-center gap-3">
            <RefreshCw className={`w-4 h-4 text-brand-light ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Points Balance</span>
          </div>
        </button>

        {/* Developer fast switch */}
        <button
          onClick={() => {
            logout();
            navigate('/login');
          }}
          className="w-full flex items-center justify-between p-4 bg-slate-900/40 border border-slate-800/40 rounded-2xl text-slate-300 hover:text-white hover:bg-slate-900/60 transition-all text-sm font-medium"
        >
          <div className="flex items-center gap-3">
            <Smartphone className="w-4 h-4 text-brand-light" />
            <span>Switch to Merchant View</span>
          </div>
        </button>

        {/* Sign Out */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-between p-4 bg-red-500/5 border border-red-500/10 rounded-2xl text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all text-sm font-bold"
        >
          <div className="flex items-center gap-3">
            <LogOut className="w-4 h-4" />
            <span>Sign Out Account</span>
          </div>
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
