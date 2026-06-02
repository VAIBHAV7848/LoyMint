import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../services/apiClient';
import { ShieldCheck, Mail, Lock, Sparkles, User, HelpCircle } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((state) => state.login);
  const checkAuth = useAuthStore((state) => state.checkAuth);

  const [role, setRole] = useState('customer'); // 'customer' or 'shopkeeper'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (isRegistering && !name) {
      setError('Please provide your name.');
      setLoading(false);
      return;
    }

    try {
      if (isRegistering) {
        // Register flow: Set mock token for registration request, then call completeProfile
        const targetEmail = email || 'customer@loymint.com';
        const token = `mock-token-${role === 'shopkeeper' ? 'merchant' : 'customer'}-${targetEmail}`;
        localStorage.setItem('loymint_token', token);

        // Call backend completeProfile to insert user record into Postgres DB
        const profileRes = await api.auth.completeProfile(name, role, referralCode);
        const registeredUser = profileRes.data.user;
        
        // Cache user details and sync store state
        localStorage.setItem('loymint_user', JSON.stringify(registeredUser));
        await checkAuth();
      } else {
        // Standard Login: hit API to verify email exists in the database
        const defaultEmail = role === 'shopkeeper' ? 'merchant@loymint.com' : 'customer@loymint.com';
        await login(email || defaultEmail, role);
      }

      // Navigate to correct dashboard
      const from = location.state?.from || (role === 'shopkeeper' ? '/merchant/dashboard' : '/customer/dashboard');
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mobile-viewport min-h-screen flex flex-col justify-between p-6">
      
      {/* Header Logo */}
      <div className="flex flex-col items-center mt-12 mb-6">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-brand to-violet-500 shadow-premium flex items-center justify-center text-white mb-3">
          <ShieldCheck className="w-9 h-9" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-purple-200 to-white bg-clip-text text-transparent">
          LoyMint
        </h1>
        <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-semibold">
          Scan. Pay. Earn Local Rewards.
        </p>
      </div>

      {/* Role Toggle Selector */}
      <div className="bg-slate-900/60 border border-slate-800/80 p-1 rounded-2xl flex gap-1 mb-6">
        <button
          type="button"
          onClick={() => { setRole('customer'); setIsRegistering(false); }}
          className={`flex-1 py-3 text-xs font-semibold rounded-xl transition-all duration-200 ${
            role === 'customer' 
              ? 'bg-brand text-white shadow-premium' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Customer App
        </button>
        <button
          type="button"
          onClick={() => { setRole('shopkeeper'); setIsRegistering(false); }}
          className={`flex-1 py-3 text-xs font-semibold rounded-xl transition-all duration-200 ${
            role === 'shopkeeper' 
              ? 'bg-brand text-white shadow-premium' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Merchant App
        </button>
      </div>

      {/* Form Card */}
      <div className="glass-card rounded-3xl p-6 border border-slate-800/60 shadow-xl flex-1 flex flex-col justify-center">
        <h2 className="text-xl font-bold text-slate-100 mb-6 text-center">
          {isRegistering ? 'Create your Account' : `Sign in as ${role === 'shopkeeper' ? 'Merchant' : 'Customer'}`}
        </h2>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegistering && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Rohan Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl py-3.5 pl-11 pr-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-brand-light transition-colors"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                placeholder={role === 'shopkeeper' ? 'merchant@loymint.com' : 'customer@loymint.com'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl py-3.5 pl-11 pr-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-brand-light transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl py-3.5 pl-11 pr-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-brand-light transition-colors"
              />
            </div>
          </div>

          {isRegistering && role === 'customer' && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Referral Code (Optional)</label>
              <input
                type="text"
                placeholder="e.g. VIKRAM99"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl py-3.5 px-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-brand-light transition-colors"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-brand to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white rounded-xl py-3.5 text-sm font-bold shadow-premium hover:shadow-premium-hover transition-all duration-300 mt-2 transform active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'Processing...' : isRegistering ? 'Register Profile' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400">
          {role === 'customer' ? (
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-brand-light hover:underline font-medium"
            >
              {isRegistering ? 'Already have an account? Sign In' : 'New to LoyMint? Create Account'}
            </button>
          ) : (
            <span className="text-slate-500">
              Merchant account activation is handled by LoyMint Admin.
            </span>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="text-center text-[10px] text-slate-600 mt-6 flex items-center justify-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-brand-light" />
        <span>Demo Sandbox Mode Active • No real payment required</span>
      </div>

    </div>
  );
}
