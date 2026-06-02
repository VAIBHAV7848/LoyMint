import React from 'react';
import { Wallet, Award, TrendingUp } from 'lucide-react';

export default function PointsCard({ points = 0 }) {
  return (
    <div className="glass-premium rounded-3xl p-6 text-white relative overflow-hidden shadow-premium mb-6">
      {/* Decorative background lights */}
      <div className="absolute -right-10 -top-10 w-32 h-32 bg-violet-400/20 rounded-full blur-2xl" />
      <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-brand/30 rounded-full blur-2xl" />

      <div className="flex justify-between items-start mb-4">
        <div>
          <span className="text-xs text-slate-300 uppercase tracking-widest font-semibold">
            LoyMint points wallet
          </span>
          <div className="flex items-baseline mt-1">
            <h2 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
              {points}
            </h2>
            <span className="text-sm font-semibold text-purple-300 ml-2">PTS</span>
          </div>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10">
          <Wallet className="w-6 h-6 text-purple-200" />
        </div>
      </div>

      <div className="border-t border-white/10 pt-4 mt-2 flex justify-between items-center text-xs text-purple-100">
        <div className="flex items-center gap-1.5">
          <Award className="w-4 h-4 text-purple-300" />
          <span>Value: ₹{(points * 0.1).toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-purple-300" />
          <span>Earn Rate: Up to 20%</span>
        </div>
      </div>
    </div>
  );
}
