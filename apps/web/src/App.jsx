import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';

// Common pages
import LoginPage from './routes/customer/LoginPage';

// Customer pages
import DashboardPage from './routes/customer/DashboardPage';
import NearbyShopsPage from './routes/customer/NearbyShopsPage';
import ShopDetailPage from './routes/customer/ShopDetailPage';
import ScannerPage from './routes/customer/ScannerPage';
import PaymentPreviewPage from './routes/customer/PaymentPreviewPage';
import RewardsPage from './routes/customer/RewardsPage';
import ProfilePage from './routes/customer/ProfilePage';

// Merchant pages
import MerchantDashboardPage from './routes/merchant/MerchantDashboardPage';
import ShopSetupPage from './routes/merchant/ShopSetupPage';
import GenerateQrPage from './routes/merchant/GenerateQrPage';
import OffersManagerPage from './routes/merchant/OffersManagerPage';

// Route guards
function AuthRequired({ children }) {
  const { isAuthenticated, loading } = useAuthStore();
  const location = useLocation();
  
  if (loading) {
    return (
      <div className="mobile-viewport min-h-screen flex items-center justify-center text-slate-500">
        Authenticating session...
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/login" state={{ from: location }} replace />;
}

function RoleRequired({ children, allowedRole }) {
  const { user } = useAuthStore();
  
  // Wait if user profile is loading
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Map roles: 'customer' -> 'customer', 'shopkeeper' -> 'merchant'
  const userRole = user.role === 'shopkeeper' ? 'merchant' : 'customer';
  
  if (userRole !== allowedRole) {
    const fallbackPath = userRole === 'merchant' ? '/merchant/dashboard' : '/customer/dashboard';
    return <Navigate to={fallbackPath} replace />;
  }

  return children;
}

export default function App() {
  const checkAuth = useAuthStore((state) => state.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Guest Login Route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Customer Private Routes */}
        <Route
          path="/customer/dashboard"
          element={
            <AuthRequired>
              <RoleRequired allowedRole="customer">
                <DashboardPage />
              </RoleRequired>
            </AuthRequired>
          }
        />
        <Route
          path="/customer/shops"
          element={
            <AuthRequired>
              <RoleRequired allowedRole="customer">
                <NearbyShopsPage />
              </RoleRequired>
            </AuthRequired>
          }
        />
        <Route
          path="/customer/shop/:shopId"
          element={
            <AuthRequired>
              <RoleRequired allowedRole="customer">
                <ShopDetailPage />
              </RoleRequired>
            </AuthRequired>
          }
        />
        <Route
          path="/customer/scan"
          element={
            <AuthRequired>
              <RoleRequired allowedRole="customer">
                <ScannerPage />
              </RoleRequired>
            </AuthRequired>
          }
        />
        <Route
          path="/customer/payment-preview/:orderId"
          element={
            <AuthRequired>
              <RoleRequired allowedRole="customer">
                <PaymentPreviewPage />
              </RoleRequired>
            </AuthRequired>
          }
        />
        <Route
          path="/customer/rewards"
          element={
            <AuthRequired>
              <RoleRequired allowedRole="customer">
                <RewardsPage />
              </RoleRequired>
            </AuthRequired>
          }
        />
        <Route
          path="/customer/profile"
          element={
            <AuthRequired>
              <RoleRequired allowedRole="customer">
                <ProfilePage />
              </RoleRequired>
            </AuthRequired>
          }
        />

        {/* Merchant Private Routes */}
        <Route
          path="/merchant/dashboard"
          element={
            <AuthRequired>
              <RoleRequired allowedRole="merchant">
                <MerchantDashboardPage />
              </RoleRequired>
            </AuthRequired>
          }
        />
        <Route
          path="/merchant/shop-setup"
          element={
            <AuthRequired>
              <RoleRequired allowedRole="merchant">
                <ShopSetupPage />
              </RoleRequired>
            </AuthRequired>
          }
        />
        <Route
          path="/merchant/generate-qr"
          element={
            <AuthRequired>
              <RoleRequired allowedRole="merchant">
                <GenerateQrPage />
              </RoleRequired>
            </AuthRequired>
          }
        />
        <Route
          path="/merchant/offers"
          element={
            <AuthRequired>
              <RoleRequired allowedRole="merchant">
                <OffersManagerPage />
              </RoleRequired>
            </AuthRequired>
          }
        />

        {/* Root Redirect fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
