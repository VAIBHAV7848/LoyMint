import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../services/apiClient';
import TransactionRow from '../../components/loyalty/TransactionRow';
import { LogOut, BarChart3, TrendingUp, Store, QrCode, ClipboardList, Gift, BellRing } from 'lucide-react';

export default function MerchantDashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const [metrics, setMetrics] = useState({
    totalVolume: 0,
    upiCollected: 0,
    discountGiven: 0,
    paidTransactions: 0,
    pendingTransactions: 0
  });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState(null);
  
  // Realtime notification state
  const [notification, setNotification] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch merchant shop profile
      const shopRes = await api.shops.getNearby(12.934, 77.624, 20);
      const myShop = shopRes.data.shops.find(s => s.is_active === true) || null;
      setShop(myShop);

      if (myShop) {
        // Fetch dashboard metrics
        const dashRes = await api.merchant.getDashboard();
        setMetrics(dashRes.data.metrics);
        setTransactions(dashRes.data.transactions || []);
      }
    } catch (err) {
      console.error('Failed to load merchant dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Set up SSE Stream connection for real-time transactions
  useEffect(() => {
    if (!shop?.id) return;

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
    const eventSource = new EventSource(`${API_BASE_URL}/payment/stream?shopId=${shop.id}`);

    eventSource.onmessage = (event) => {
      try {
        const transaction = JSON.parse(event.data);
        if (transaction.connected) return; // ignore keepalive connection ping
        
        console.log('SSE Realtime payment update received:', transaction);

        // 1. Show custom premium animated floating notification popup
        if (['success', 'partial_paid', 'reward_paid'].includes(transaction.status)) {
          setNotification(transaction);
          setTimeout(() => setNotification(null), 5000); // clear after 5s
        }

        // 2. Refresh metrics and transactions list instantly
        api.merchant.getDashboard().then(dashRes => {
          setMetrics(dashRes.data.metrics);
          setTransactions(dashRes.data.transactions || []);
        });
      } catch (err) {
        console.error('Error parsing SSE event data:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.warn('SSE EventSource error, closing connection.', err);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [shop?.id]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="mobile-viewport min-h-screen flex items-center justify-center text-slate-500">
        Loading merchant profile...
      </div>
    );
  }

  return (
    <div className="mobile-viewport min-h-screen pb-6 flex flex-col justify-between">
      
      <div>
        {/* Header */}
        <div className="flex justify-between items-center px-6 pt-8 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand border border-purple-500/20 flex items-center justify-center text-white font-extrabold text-sm shadow-premium">
              🏪
            </div>
            <div>
              <span className="text-slate-400 text-xs font-semibold">Merchant Dashboard</span>
              <h1 className="text-slate-100 font-extrabold text-base leading-tight">
                {shop?.name || 'My Shop'}
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

        {/* Real-time floating toast banner */}
        {notification && (
          <div className="px-6 mb-4 animate-bounce">
            <div className="glass-premium border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3 shadow-premium text-white">
              <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <BellRing className="w-5 h-5 animate-pulse" />
              </div>
              <div className="flex-1 text-xs">
                <h4 className="font-bold text-emerald-400 text-sm">🎉 Payment Received!</h4>
                <p className="text-slate-200 mt-0.5">
                  Amount of <strong>₹{notification.amount}</strong> paid successfully.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="px-6 space-y-5">
          
          {/* Shop Activation Alert if no shop exists */}
          {!shop && (
            <div className="p-5 glass rounded-3xl border border-amber-500/20 text-slate-300 text-xs space-y-3">
              <p className="font-semibold text-amber-400">Shop Profile Incomplete</p>
              <p>Configure your shop name, address and points rules to begin accepting LoyMint customer payments!</p>
              <button
                onClick={() => navigate('/merchant/shop-setup')}
                className="px-4 py-2 bg-brand text-white rounded-lg font-bold"
              >
                Configure Shop Profile
              </button>
            </div>
          )}

          {/* Metrics Grid */}
          {shop && (
            <div className="grid grid-cols-2 gap-3.5">
              <div className="glass-card rounded-2xl p-4 border border-slate-850">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest block font-medium">Total Volume</span>
                <span className="text-xl font-extrabold text-white mt-1 block">₹{metrics.totalVolume}</span>
              </div>
              <div className="glass-card rounded-2xl p-4 border border-slate-850">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest block font-medium">UPI Collected</span>
                <span className="text-xl font-extrabold text-emerald-400 mt-1 block">₹{metrics.upiCollected}</span>
              </div>
              <div className="glass-card rounded-2xl p-4 border border-slate-850">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest block font-medium">Rewards Value</span>
                <span className="text-xl font-extrabold text-brand-light mt-1 block">₹{metrics.discountGiven}</span>
              </div>
              <div className="glass-card rounded-2xl p-4 border border-slate-850">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest block font-medium">Transactions</span>
                <span className="text-xl font-extrabold text-white mt-1 block">{metrics.paidTransactions}</span>
              </div>
            </div>
          )}

          {/* Quick Actions Drawer */}
          {shop && (
            <div className="glass rounded-3xl p-4 border border-slate-800/40">
              <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-3">Merchant Utilities</h3>
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  onClick={() => navigate('/merchant/generate-qr')}
                  className="flex flex-col items-center justify-center p-3.5 bg-slate-950/60 border border-slate-850 rounded-2xl hover:border-brand-light transition-all duration-300"
                >
                  <QrCode className="w-6 h-6 text-brand-light mb-1.5" />
                  <span className="text-[10px] font-semibold text-slate-300">Bill QR</span>
                </button>
                <button
                  onClick={() => navigate('/merchant/offers')}
                  className="flex flex-col items-center justify-center p-3.5 bg-slate-950/60 border border-slate-850 rounded-2xl hover:border-brand-light transition-all duration-300"
                >
                  <Gift className="w-6 h-6 text-brand-light mb-1.5" />
                  <span className="text-[10px] font-semibold text-slate-300">Offers CRUD</span>
                </button>
                <button
                  onClick={() => navigate('/merchant/shop-setup')}
                  className="flex flex-col items-center justify-center p-3.5 bg-slate-950/60 border border-slate-850 rounded-2xl hover:border-brand-light transition-all duration-300"
                >
                  <Store className="w-6 h-6 text-brand-light mb-1.5" />
                  <span className="text-[10px] font-semibold text-slate-300">Configure</span>
                </button>
              </div>
            </div>
          )}

          {/* Recent Transactions List */}
          {shop && (
            <div className="space-y-3">
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                <ClipboardList className="w-4.5 h-4.5 text-brand-light" />
                Recent Sales
              </h3>

              {transactions.length === 0 ? (
                <div className="p-8 text-center glass rounded-2xl border border-slate-800/40 text-slate-500 text-xs">
                  No sales recorded yet. Use Bill QR tool to accept points!
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {transactions.map((tx) => (
                    <TransactionRow key={tx.id} tx={tx} isMerchant={true} />
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Switcher back to customer */}
      <div className="px-6 mt-12">
        <button
          onClick={() => {
            logout();
            navigate('/login');
          }}
          className="w-full py-3 border border-slate-850 bg-slate-900/60 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-xl text-center"
        >
          Logout & Switch to Customer Profile
        </button>
      </div>

    </div>
  );
}
