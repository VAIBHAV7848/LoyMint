import { create } from 'zustand';
import { api } from '../services/apiClient';

export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true,

  checkAuth: async () => {
    set({ loading: true });
    const token = localStorage.getItem('loymint_token');
    const localUser = localStorage.getItem('loymint_user');

    if (!token) {
      set({ user: null, token: null, isAuthenticated: false, loading: false });
      return;
    }

    try {
      // In real app, fetch /me from API to verify token
      const meRes = await api.auth.me();
      const user = meRes.data.user;
      
      localStorage.setItem('loymint_user', JSON.stringify(user));
      set({ user, token, isAuthenticated: true, loading: false });
    } catch (err) {
      console.warn('Token check failed, using local storage cache', err);
      // Fallback to cached local user if API fails
      if (localUser) {
        set({ user: JSON.parse(localUser), token, isAuthenticated: true, loading: false });
      } else {
        localStorage.removeItem('loymint_token');
        set({ user: null, token: null, isAuthenticated: false, loading: false });
      }
    }
  },

  login: async (email, role) => {
    set({ loading: true });
    try {
      const loginRes = await api.auth.loginMock(email, role);
      const user = loginRes.data.user;
      const token = localStorage.getItem('loymint_token');
      
      set({ user, token, isAuthenticated: true, loading: false });
      return user;
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  logout: async () => {
    await api.auth.logout();
    set({ user: null, token: null, isAuthenticated: false, loading: false });
  },

  setUser: (user) => {
    localStorage.setItem('loymint_user', JSON.stringify(user));
    set({ user });
  }
}));
