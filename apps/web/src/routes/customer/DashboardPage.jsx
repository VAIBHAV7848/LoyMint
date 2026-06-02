import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../services/apiClient';
import PointsCard from '../../components/loyalty/PointsCard';
import ShopCard from '../../components/loyalty/ShopCard';
import OfferCard from '../../components/loyalty/OfferCard';
import { LogOut, Heart, Gift, Compass, ChevronRight, User } from 'lucide-react';
import BottomNav from '../../components/ui/BottomNav';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  
  const [favorites, setFavorites] = useState([]);
  const [nearbyShops, setNearbyShops] = useState([]);
  const [savedOffers, setSavedOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // 1. Fetch nearby shops (using default location coordinates of Koramangala, Bangalore)
        const shopsRes = await api.shops.getNearby(12.934, 77.624, 10);
        setNearbyShops(shopsRes.data.shops.slice(0, 3));

        // 2. Fetch user favorites
        const favsRes = await api.user.getFavorites();
        setFavorites(favsRes.data.shops || []);

        // 3. Fetch saved offers
        const offersRes = await api.user.getSavedOffers();
        setSavedOffers(offersRes.data.offers || []);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleToggleFavorite = async (shopId) => {
    try {
      const isFav = favorites.some(f => f.id === shopId);
      if (isFav) {
        await api.user.unfavoriteShop(shopId);
        setFavorites(favorites.filter(f => f.id !== shopId));
      } else {
        await api.user.favoriteShop(shopId);
        // fetch updated list
        const favsRes = await api.user.getFavorites();
        setFavorites(favsRes.data.shops || []);
      }
    } catch (err) {
      console.error('Failed to toggle favorite shop:', err);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="mobile-viewport min-h-screen pb-24">
      {/* Top Header */}
      <div className="flex justify-between items-center px-6 pt-8 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-dark border border-purple-500/20 flex items-center justify-center text-brand-light font-bold text-sm">
            {user?.name?.substring(0, 2).toUpperCase() || 'US'}
          </div>
          <div>
            <span className="text-slate-400 text-xs font-semibold">Welcome back,</span>
            <h1 className="text-slate-100 font-extrabold text-base leading-tight">
              {user?.name || 'LoyMint User'} 👋
            </h1>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-red-400 transition-colors"
          aria-label="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      <div className="px-6">
        {/* Points Display Wallet */}
        <PointsCard points={user?.pointsBalance || 0} />

        {/* Saved Offers Carousel */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-base text-slate-100 flex items-center gap-1.5">
              <Gift className="w-4.5 h-4.5 text-brand-light" />
              Saved Offers
            </h3>
            {savedOffers.length > 0 && (
              <button 
                onClick={() => navigate('/customer/rewards')}
                className="text-xs text-brand-light font-medium flex items-center"
              >
                View all <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {savedOffers.length === 0 ? (
            <div className="p-5 glass rounded-2xl text-center border border-slate-800/40 text-slate-500 text-xs">
              No saved offers yet. Go to shops to browse active rewards!
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none snap-x">
              {savedOffers.map((offer) => (
                <div key={offer.id} className="min-w-[240px] max-w-[240px] snap-start">
                  <OfferCard 
                    offer={offer} 
                    isSaved={true}
                    userPoints={user?.pointsBalance || 0}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Favorite Shops */}
        <div className="mb-6">
          <h3 className="font-bold text-base text-slate-100 flex items-center gap-1.5 mb-3">
            <Heart className="w-4.5 h-4.5 text-red-400" />
            Favorite Shops
          </h3>

          {favorites.length === 0 ? (
            <div className="p-5 glass rounded-2xl text-center border border-slate-800/40 text-slate-500 text-xs">
              Favorite shops to find them quickly here.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {favorites.map((shop) => (
                <ShopCard
                  key={shop.id}
                  shop={shop}
                  isFavorite={true}
                  onToggleFavorite={handleToggleFavorite}
                  onClick={() => navigate(`/customer/shop/${shop.id}`)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Nearby Shops Section */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-base text-slate-100 flex items-center gap-1.5">
              <Compass className="w-4.5 h-4.5 text-brand-light" />
              Nearby Hotspots
            </h3>
            <button 
              onClick={() => navigate('/customer/shops')}
              className="text-xs text-brand-light font-medium flex items-center"
            >
              Search all <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {nearbyShops.map((shop) => (
              <ShopCard
                key={shop.id}
                shop={shop}
                isFavorite={favorites.some(f => f.id === shop.id)}
                onToggleFavorite={handleToggleFavorite}
                onClick={() => navigate(`/customer/shop/${shop.id}`)}
              />
            ))}
          </div>
        </div>

      </div>

      <BottomNav />
    </div>
  );
}
