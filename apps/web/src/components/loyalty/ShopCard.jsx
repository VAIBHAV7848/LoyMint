import React from 'react';
import { Store, Star, Heart, MapPin, Gift } from 'lucide-react';

export default function ShopCard({ shop, isFavorite, onToggleFavorite, onClick }) {
  const distanceKm = shop.distance_km ? parseFloat(shop.distance_km).toFixed(1) : null;

  return (
    <div 
      onClick={onClick}
      className="glass-card rounded-2xl p-4 flex gap-4 border border-slate-800/40 hover:border-brand-light/30 transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer relative group"
    >
      {/* Favorite Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite(shop.id);
        }}
        className={`absolute top-4 right-4 z-10 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition-all duration-200 ${
          isFavorite 
            ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' 
            : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
        }`}
        aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
      </button>

      {/* Shop Image representation */}
      <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-purple-900/60 to-indigo-950 flex items-center justify-center border border-slate-700/30 text-brand-light shrink-0">
        <Store className="w-10 h-10 group-hover:scale-110 transition-transform duration-300" />
      </div>

      {/* Details */}
      <div className="flex flex-col justify-between overflow-hidden pr-6">
        <div>
          <h3 className="font-bold text-base text-slate-100 truncate pr-2 group-hover:text-brand-light transition-colors">
            {shop.name}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">{shop.category}</p>
        </div>

        <div className="flex flex-wrap items-center gap-y-1 gap-x-3 mt-2 text-xs text-slate-400">
          <div className="flex items-center gap-1 text-amber-400 font-semibold">
            <Star className="w-3.5 h-3.5 fill-current" />
            <span>{parseFloat(shop.rating || '4.0').toFixed(1)}</span>
          </div>

          {distanceKm !== null && (
            <div className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{distanceKm} km</span>
            </div>
          )}

          <div className="flex items-center gap-1 text-purple-300">
            <Gift className="w-3.5 h-3.5" />
            <span>{shop.earn_points_per_100} pts/₹100</span>
          </div>
        </div>
      </div>
    </div>
  );
}
