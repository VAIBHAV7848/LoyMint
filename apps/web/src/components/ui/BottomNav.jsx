import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Store, QrCode, Gift, User } from 'lucide-react';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { name: 'Home', path: '/customer/dashboard', icon: Home },
    { name: 'Shops', path: '/customer/shops', icon: Store },
    { name: 'Scan', path: '/customer/scan', icon: QrCode, isFab: true },
    { name: 'Rewards', path: '/customer/rewards', icon: Gift },
    { name: 'Profile', path: '/customer/profile', icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/90 backdrop-blur-lg border-t border-slate-800/60 max-w-[480px] mx-auto">
      <div className="flex justify-around items-center h-20 px-2 relative">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          if (item.isFab) {
            return (
              <button
                key={item.name}
                onClick={() => navigate(item.path)}
                className="absolute -top-6 left-1/2 -translate-x-1/2 flex flex-col items-center justify-center w-16 h-16 rounded-full bg-gradient-to-tr from-brand to-violet-500 shadow-premium hover:shadow-premium-hover text-white transition-all duration-300 transform active:scale-95 z-50 float-animation"
                aria-label="Scan QR Code"
              >
                <Icon className="w-8 h-8" />
              </button>
            );
          }

          return (
            <button
              key={item.name}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-all duration-200 ${
                isActive 
                  ? 'text-brand-light scale-105 font-medium' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-[10px] tracking-wide">{item.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
