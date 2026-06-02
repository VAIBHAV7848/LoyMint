import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/apiClient';
import { ChevronLeft, Store, MapPin, Gift, Sliders, ShieldCheck } from 'lucide-react';

export default function ShopSetupPage() {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState('Cafes');
  const [earnPointsPer100, setEarnPointsPer100] = useState(10);
  const [redeemPointsPerRupee, setRedeemPointsPerRupee] = useState(10);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [upiId, setUpiId] = useState('7349417848@upi');
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const categories = ['Cafes', 'Restaurants', 'Salons'];

  useEffect(() => {
    const loadShopData = async () => {
      try {
        setFetching(true);
        // Find existing shop owned by this merchant
        const shopRes = await api.shops.getNearby(12.934, 77.624, 20);
        const myShop = shopRes.data.shops.find(s => s.is_active === true) || null;
        
        if (myShop) {
          setName(myShop.name);
          setAddress(myShop.address);
          setCategory(myShop.category);
          setEarnPointsPer100(myShop.earn_points_per_100);
          setRedeemPointsPerRupee(myShop.redeem_points_per_rupee);
          setUpiId(myShop.upi_id || '7349417848@upi');
        }
      } catch (err) {
        console.warn('Failed to load existing shop profile:', err);
      } finally {
        setFetching(false);
      }
    };
    loadShopData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError('');

    const shopData = {
      name,
      address,
      category,
      earnPointsPer100: parseInt(earnPointsPer100, 10),
      redeemPointsPerRupee: parseInt(redeemPointsPerRupee, 10),
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      upiId
    };

    try {
      await api.shops.createMerchantShop(shopData);
      setSuccess(true);
      setTimeout(() => navigate('/merchant/dashboard'), 1500);
    } catch (err) {
      setError(err.message || 'Failed to save shop profile settings.');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="mobile-viewport min-h-screen flex items-center justify-center text-slate-500">
        Loading shop configurations...
      </div>
    );
  }

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
        <h1 className="text-xl font-bold text-slate-100 font-sans">Configure Shop</h1>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 py-4">
        
        {success && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl text-xs mb-4 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            <span>Shop profile updated successfully! Redirecting...</span>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-xs mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Shop Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Shop Name</label>
            <div className="relative">
              <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                required
                placeholder="e.g. The Ground Bean Cafe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-200 focus:outline-none focus:border-brand-light"
              />
            </div>
          </div>

          {/* UPI ID (VPA) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Merchant UPI ID (VPA)</label>
            <div className="relative">
              <Sliders className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                required
                placeholder="e.g. 7349417848@upi"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-200 focus:outline-none focus:border-brand-light"
              />
            </div>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Business Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 text-sm text-slate-200 focus:outline-none focus:border-brand-light"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Full Address</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-4.5 w-4 h-4 text-slate-500" />
              <textarea
                required
                rows="3"
                placeholder="e.g. 123, 80 Feet Road, Koramangala, Bengaluru"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-200 focus:outline-none focus:border-brand-light resize-none"
              />
            </div>
          </div>

          {/* Sliders for Loyalty Rules */}
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/40 space-y-4">
            
            {/* Earn rate slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-slate-400">
                <span>Earn rate per ₹100 spent</span>
                <span className="text-brand-light">{earnPointsPer100} PTS</span>
              </div>
              <input
                type="range"
                min="5"
                max="30"
                step="5"
                value={earnPointsPer100}
                onChange={(e) => setEarnPointsPer100(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-brand"
              />
            </div>

            {/* Redeem rate slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-slate-400">
                <span>Redemption cost per ₹1 discount</span>
                <span className="text-emerald-400">{redeemPointsPerRupee} PTS</span>
              </div>
              <input
                type="range"
                min="5"
                max="20"
                step="1"
                value={redeemPointsPerRupee}
                onChange={(e) => setRedeemPointsPerRupee(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-brand"
              />
            </div>
          </div>

          {/* Manual GPS Overrides */}
          <div className="grid grid-cols-2 gap-3.5 pt-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Latitude (Optional)</label>
              <input
                type="number"
                step="0.000001"
                placeholder="e.g. 12.9343"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 text-xs text-slate-200 focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Longitude (Optional)</label>
              <input
                type="number"
                step="0.000001"
                placeholder="e.g. 77.6244"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 text-xs text-slate-200 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-brand to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white rounded-xl py-3.5 text-sm font-bold shadow-premium mt-6 disabled:opacity-50"
          >
            {loading ? 'Saving details...' : 'Save and Deploy Profile'}
          </button>
        </form>

      </div>

    </div>
  );
}
