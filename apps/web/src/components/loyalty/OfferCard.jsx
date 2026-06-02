import React from 'react';
import { Gift, Bookmark, CheckCircle } from 'lucide-react';

export default function OfferCard({ offer, isSaved, onToggleSave, userPoints = 0, isRedeemed }) {
  const canAfford = userPoints >= offer.points_required;
  const isFreeItem = offer.reward_type === 'free_item';

  // Category specific premium colors based on PRD UI/UX
  const borderClass = isFreeItem 
    ? 'border-l-4 border-l-loy-blue' 
    : 'border-l-4 border-l-loy-orange';
    
  const badgeBg = isFreeItem 
    ? 'bg-loy-blue/10 text-loy-blue' 
    : 'bg-loy-orange/10 text-loy-orange';

  return (
    <div className={`glass-card rounded-2xl p-4 flex flex-col justify-between border border-slate-800/40 ${borderClass} transition-all duration-300 relative`}>
      
      {/* Save Toggle */}
      {onToggleSave && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave(offer.id);
          }}
          className={`absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all duration-200 ${
            isSaved 
              ? 'bg-purple-500/20 text-brand-light' 
              : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
          }`}
          aria-label={isSaved ? 'Unsave offer' : 'Save offer'}
        >
          <Bookmark className={`w-4.5 h-4.5 ${isSaved ? 'fill-current' : ''}`} />
        </button>
      )}

      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-md ${badgeBg}`}>
            {isFreeItem ? 'Free Item' : 'Discount Coupon'}
          </span>
          {offer.shop_name && (
            <span className="text-xs text-slate-400 font-medium truncate max-w-[150px]">
              at {offer.shop_name}
            </span>
          )}
        </div>

        <h4 className="font-bold text-slate-100 text-sm leading-tight pr-6">{offer.title}</h4>
        <p className="text-xs text-slate-400 mt-1 leading-normal line-clamp-2">{offer.description}</p>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-500">POINTS REQUIRED</span>
          <span className="text-sm font-extrabold text-slate-100 flex items-center gap-1">
            <Gift className="w-3.5 h-3.5 text-brand-light" />
            {offer.points_required}
          </span>
        </div>

        {isRedeemed ? (
          <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
            <CheckCircle className="w-4 h-4" /> Redeemed
          </span>
        ) : (
          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
            canAfford 
              ? 'bg-emerald-500/10 text-emerald-400' 
              : 'bg-slate-800 text-slate-500'
          }`}>
            {canAfford ? 'Affordable' : 'Need Points'}
          </span>
        )}
      </div>
    </div>
  );
}
