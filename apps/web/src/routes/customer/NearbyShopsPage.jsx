import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/apiClient';
import ShopCard from '../../components/loyalty/ShopCard';
import { Search, MapPin, Compass, SlidersHorizontal } from 'lucide-react';
import BottomNav from '../../components/ui/BottomNav';

export default function NearbyShopsPage() {
  const navigate = useNavigate();

  const [shops, setShops] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [radius, setRadius] = useState(5); // default 5km
  const [latitude, setLatitude] = useState(12.934); // default Bangalore Koramangala
  const [longitude, setLongitude] = useState(77.624);
  const [locationStatus, setLocationStatus] = useState('Default (Koramangala)');
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);

  // Categories list
  const categories = ['All', 'Cafes', 'Restaurants', 'Salons'];

  const fetchShops = async () => {
    try {
      setLoading(true);
      const shopsRes = await api.shops.getNearby(latitude, longitude, radius, category, search);
      setShops(shopsRes.data.shops || []);

      const favsRes = await api.user.getFavorites();
      setFavorites(favsRes.data.shops || []);
    } catch (err) {
      console.error('Error fetching shops:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShops();
  }, [category, radius, latitude, longitude]);

  // Request browser geolocation
  const handleRequestLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Not supported');
      return;
    }

    setLocationStatus('Locating...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setLocationStatus('GPS Active');
      },
      (error) => {
        console.warn('Geolocation error, using Koramangala default:', error);
        setLocationStatus('Koramangala, BLR');
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  const handleToggleFavorite = async (shopId) => {
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

  return (
    <div className="mobile-viewport min-h-screen pb-24">
      {/* Search Header */}
      <div className="px-6 pt-8 pb-4 bg-slate-950/80 sticky top-0 z-30 backdrop-blur-md">
        <h1 className="text-2xl font-extrabold text-slate-100 mb-4 flex items-center gap-2">
          <Compass className="w-6 h-6 text-brand-light" />
          Discover Shops
        </h1>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search cafe, salon, food..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchShops()}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-brand-light transition-colors"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all duration-200 ${
              showFilters 
                ? 'bg-brand/20 border-brand-light text-brand-light' 
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
            aria-label="Filter configuration"
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>

        {/* Filters drawer */}
        {showFilters && (
          <div className="mt-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-4">
            {/* Radius filter */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-slate-400">
                <span>SEARCH RADIUS</span>
                <span className="text-brand-light">{radius} KM</span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                value={radius}
                onChange={(e) => setRadius(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-brand"
              />
            </div>

            {/* Geolocation trigger */}
            <div className="flex items-center justify-between border-t border-slate-800 pt-3 text-xs">
              <span className="text-slate-400 font-semibold uppercase tracking-wider">YOUR POSITION</span>
              <button
                onClick={handleRequestLocation}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-dark/40 border border-purple-500/20 text-brand-light hover:bg-brand-dark/60 font-semibold"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>{locationStatus}</span>
              </button>
            </div>
          </div>
        )}

        {/* Category Pill Slider */}
        <div className="flex gap-2 overflow-x-auto mt-4 pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 ${
                category === cat
                  ? 'bg-brand text-white shadow-premium'
                  : 'bg-slate-900 text-slate-400 border border-slate-800/80 hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* List Section */}
      <div className="px-6 flex flex-col gap-3">
        {loading ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            Searching for nearby hotspots...
          </div>
        ) : shops.length === 0 ? (
          <div className="text-center py-12 glass rounded-3xl border border-slate-800/40 text-slate-500 text-sm">
            No shops found matching filters in this radius.
          </div>
        ) : (
          shops.map((shop) => (
            <ShopCard
              key={shop.id}
              shop={shop}
              isFavorite={favorites.some(f => f.id === shop.id)}
              onToggleFavorite={handleToggleFavorite}
              onClick={() => navigate(`/customer/shop/${shop.id}`)}
            />
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
}
