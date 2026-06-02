import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8080/api'
    : '/api');

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to attach JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('loymint_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || 'Something went wrong';
    return Promise.reject(new Error(message));
  }
);

export const api = {
  // Auth Modules
  auth: {
    me: () => apiClient.get('/auth/me'),
    completeProfile: (name, role, referralCode) => 
      apiClient.post('/auth/profile/complete', { name, role, referralCode }),
    
    // Local Simulator Login / Signup
    loginMock: async (email, role) => {
      const isMerchant = role === 'shopkeeper';
      const token = `mock-token-${isMerchant ? 'merchant' : 'customer'}-${email}`;
      
      localStorage.setItem('loymint_token', token);
      
      try {
        const meRes = await apiClient.get('/auth/me');
        const user = meRes.data.user;
        
        localStorage.setItem('loymint_user', JSON.stringify(user));
        return {
          status: 'success',
          data: { user }
        };
      } catch (err) {
        localStorage.removeItem('loymint_token');
        localStorage.removeItem('loymint_user');
        throw err;
      }
    },
    logout: () => {
      localStorage.removeItem('loymint_token');
      localStorage.removeItem('loymint_user');
      return Promise.resolve();
    }
  },

  // Shops Modules
  shops: {
    getNearby: (lat, lng, radius, category, search) => 
      apiClient.get('/shops/nearby', { params: { lat, lng, radius, category, search } }),
    getDetails: (shopId) => apiClient.get(`/shops/${shopId}`),
    createMerchantShop: (shopData) => apiClient.post('/merchant/shop', shopData)
  },

  // QR and Payments Modules
  payments: {
    generateQr: (amount) => apiClient.post('/merchant/bills/generate-qr', { amount }),
    initiateFromQr: (qrToken) => apiClient.post('/payment/initiate-from-qr', { qrToken }),
    getRewardPreview: (orderId, applyRewards) => 
      apiClient.post('/payment/reward-preview', { orderId, applyRewards }),
    createOrder: (orderId, rewardPointsToRedeem) => 
      apiClient.post('/payment/create-order', { orderId, rewardPointsToRedeem }),
    payWithRewards: (orderId, pointsToRedeem) => 
      apiClient.post('/payment/reward-only', { orderId, pointsToRedeem }),
    completeMockPayment: (orderId, success) => 
      apiClient.post('/payment/mock-complete', { orderId, success }),
    getTransactionDetails: (orderId) => apiClient.get(`/payment/details/${orderId}`)
  },

  // User Actions Modules
  user: {
    getTransactions: () => apiClient.get('/user/transactions'),
    getPointsLog: () => apiClient.get('/user/points-log'),
    getFavorites: () => apiClient.get('/user/favorites'),
    favoriteShop: (shopId) => apiClient.post(`/user/favorites/${shopId}`),
    unfavoriteShop: (shopId) => apiClient.delete(`/user/favorites/${shopId}`),
    getSavedOffers: () => apiClient.get('/user/saved-offers'),
    saveOffer: (offerId) => apiClient.post(`/user/saved-offers/${offerId}`),
    unsaveOffer: (offerId) => apiClient.delete(`/user/saved-offers/${offerId}`)
  },

  // Merchant Modules
  merchant: {
    getDashboard: () => apiClient.get('/merchant/dashboard'),
    getOffers: () => apiClient.get('/merchant/offers'),
    createOffer: (offerData) => apiClient.post('/merchant/offers', offerData),
    updateOffer: (offerId, offerData) => apiClient.put(`/merchant/offers/${offerId}`, offerData),
    deleteOffer: (offerId) => apiClient.delete(`/merchant/offers/${offerId}`)
  }
};
