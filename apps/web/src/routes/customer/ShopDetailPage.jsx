import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/apiClient';
import OfferCard from '../../components/loyalty/OfferCard';
import { ChevronLeft, Star, Heart, MapPin, Gift, Phone, Clock, Store } from 'lucide-react';
import BottomNav from '../../components/ui/BottomNav';

export default function ShopDetailPage() {
  const { shopId } = useParams();
  const navigate = useNavigate();

  const [shop, setShop] = useState(null);
  const [offers, setOffers] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [savedOffers, setSavedOffers] = useState([]);
  const [activeTab, setActiveTab] = useState('offers'); // 'offers' or 'about'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = await api.shops.getDetails(shopId);
      setShop(res.data.shop);
      setOffers(res.data.offers || []);

      // Fetch favs
      const favsRes = await api.user.getFavorites();
      setFavorites(favsRes.data.shops || []);

      // Fetch saved offers
      const savedRes = await api.user.getSavedOffers();
      setSavedOffers(savedRes.data.offers || []);
    } catch (err) {
      setError(err.message || 'Failed to load shop details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [shopId]);

  const handleToggleFavorite = async () => {
    try {
      const isFav = favorites.some(f => f.id === shopId);
      if (isFav) {
        await api.user.unfavoriteShop(shopId);
        setFavorites(favorites.filter(f => f.id !== shopId));
      } else {
        await api.user.favoriteShop(shopId);
        const favsRes = await api.user.getFavorites();
        setFavorites(favsRes.data.shops || []);
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const handleToggleSaveOffer = async (offerId) => {
    try {
      const isSaved = savedOffers.some(o => o.id === offerId);
      if (isSaved) {
        await api.user.unsaveOffer(offerId);
        setSavedOffers(savedOffers.filter(o => o.id !== offerId));
      } else {
        await api.user.saveOffer(offerId);
        const savedRes = await api.user.getSavedOffers();
        setSavedOffers(savedRes.data.offers || []);
      }
    } catch (err) {
      console.error('Failed to toggle save offer:', err);
    }
  };

  if (loading) {
    return (
      <div className="mobile-viewport min-h-screen flex items-center justify-center text-slate-500">
        Loading shop details...
      </div>
    );
  }

  if (error || !shop) {
    return (
      <div className="mobile-viewport min-h-screen p-6 flex flex-col justify-center items-center text-center">
        <div className="text-red-400 font-bold mb-4">{error || 'Shop details could not be found'}</div>
        <button 
          onClick={() => navigate(-1)}
          className="px-6 py-2.5 bg-brand text-white rounded-xl text-sm font-semibold"
        >
          Go Back
        </button>
      </div>
    );
  }

  const isFavorite = favorites.some(f => f.id === shop.id);

  return (
    <div className="mobile-viewport min-h-screen pb-24">
      {/* Detail Banner Header */}
      <div className="relative h-56 bg-gradient-to-br from-brand-dark via-violet-950 to-slate-950 flex flex-col justify-between p-6">
        
        {/* Buttons */}
        <div className="flex justify-between items-center w-full z-10">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-slate-900/60 backdrop-blur-md flex items-center justify-center text-slate-300 hover:text-white"
            aria-label="Back"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <button
            onClick={handleToggleFavorite}
            className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md transition-all duration-200 ${
              isFavorite 
                ? 'bg-red-500/10 text-red-500' 
                : 'bg-slate-900/60 text-slate-300'
            }`}
            aria-label="Favorite Shop"
          >
            <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Shop Cover Content */}
        <div className="z-10 mt-auto">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-brand/30 border border-brand-light/20 text-brand-light">
              {shop.category}
            </span>
            <div className="flex items-center gap-0.5 text-xs text-amber-400 font-bold">
              <Star className="w-3.5 h-3.5 fill-current" />
              <span>{parseFloat(shop.rating || '4.0').toFixed(1)}</span>
            </div>
          </div>
          <h1 className="text-2xl font-extrabold text-white mt-1 leading-tight">{shop.name}</h1>
          <p className="text-xs text-slate-300 flex items-center gap-1 mt-1 truncate">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{shop.address}</span>
          </p>
        </div>

        {/* Decorative blur overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
      </div>

      {/* Loyalty Specification Badges */}
      <div className="px-6 py-4 flex gap-3 mt-2">
        <div className="flex-1 glass-card rounded-2xl p-3 border border-slate-800/40 text-center">
          <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-medium">Earn Rate</span>
          <span className="text-sm font-extrabold text-brand-light mt-1 inline-flex items-center gap-1">
            <Gift className="w-4 h-4" />
            {shop.earn_points_per_100} PTS / ₹100
          </span>
        </div>
        <div className="flex-1 glass-card rounded-2xl p-3 border border-slate-800/40 text-center">
          <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-medium">Redeem Rate</span>
          <span className="text-sm font-extrabold text-emerald-400 mt-1 inline-flex items-center gap-1">
            <Store className="w-4 h-4" />
            {shop.redeem_points_per_rupee} PTS = ₹1
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 border-b border-slate-800/80 flex gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('offers')}
          className={`pb-3 relative transition-colors ${
            activeTab === 'offers' ? 'text-brand-light font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Active Offers
          {activeTab === 'offers' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-light rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('about')}
          className={`pb-3 relative transition-colors ${
            activeTab === 'about' ? 'text-brand-light font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          About Shop
          {activeTab === 'about' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-light rounded-full" />
          )}
        </button>
      </div>

      {/* Tab Panels */}
      <div className="px-6 py-4">
        {activeTab === 'offers' ? (
          offers.length === 0 ? (
            <div className="p-8 text-center glass rounded-3xl border border-slate-800/40 text-slate-500 text-xs">
              No active offers at this shop. Check back later!
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {offers.map((offer) => (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  isSaved={savedOffers.some(s => s.id === offer.id)}
                  onToggleSave={handleToggleSaveOffer}
                />
              ))}
            </div>
          )
        ) : (
          <div className="glass-card rounded-2xl p-5 border border-slate-800/40 space-y-4 text-sm text-slate-300">
            <div>
              <h4 className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-1">Full Address</h4>
              <p className="leading-relaxed">{shop.address}</p>
            </div>
            
            <div className="flex gap-6 border-t border-slate-800/80 pt-4">
              <div className="flex-1 flex gap-2.5 items-center">
                <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Timings</h4>
                  <p className="text-xs font-semibold">9:00 AM - 10:00 PM</p>
                </div>
              </div>

              <div className="flex-1 flex gap-2.5 items-center">
                <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Contact</h4>
                  <p className="text-xs font-semibold">+91 9988776655</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
