import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import { Login } from './pages/Login';
import { AdminDashboard } from './pages/AdminDashboard';
import { RestaurantDashboard } from './pages/RestaurantDashboard';
import { CustomerMenu } from './pages/CustomerMenu';
import { StaffFloorPortal } from './components/StaffFloorPortal';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  // Sync with browser navigation
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#FF5C38]/20 border-t-[#FF5C38] rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-500">Loading RestoQR Platform...</p>
        </div>
      </div>
    );
  }

  // 1. Check if Customer Menu route: /menu/:slug or /menu/:slug/table/:tableNum
  if (currentPath.startsWith('/menu')) {
    const parts = currentPath.split('/').filter(Boolean);
    // parts[0] === 'menu', parts[1] === slug, parts[2] === 'table', parts[3] === tableNum
    const slug = parts[1] || 'urban-bites-cafe';
    let tableNum: number | undefined;

    if (parts[2] === 'table' && parts[3]) {
      const parsed = parseInt(parts[3], 10);
      if (!isNaN(parsed)) {
        tableNum = parsed;
      }
    }

    return <CustomerMenu slug={slug} tableNumber={tableNum} onNavigate={navigate} />;
  }

  // 2. Role-based Route Protection
  // If not logged in -> ALWAYS show Login page as required by Requirement #2
  if (!user) {
    return <Login onNavigate={navigate} />;
  }

  // If Super Admin tries to access
  if (user.role === 'platform_admin') {
    if (currentPath.startsWith('/admin') || currentPath === '/' || currentPath === '/login') {
      return <AdminDashboard onNavigate={navigate} />;
    }
    // Admin can also view restaurant dashboard if requested
    if (currentPath.startsWith('/restaurant')) {
      const tab = currentPath.split('/')[2] || 'dashboard';
      return <RestaurantDashboard onNavigate={navigate} initialTab={tab} />;
    }
    return <AdminDashboard onNavigate={navigate} />;
  }

  // If Restaurant User (Owner, Manager, Kitchen, Waiter) tries to access /admin -> DENY
  if (currentPath.startsWith('/admin')) {
    navigate('/restaurant/pos');
    return <RestaurantDashboard onNavigate={navigate} initialTab="pos" />;
  }

  // Specific staff routing
  if (user.role === 'kitchen_staff') {
    return <RestaurantDashboard onNavigate={navigate} initialTab="kitchen" />;
  }

  if (user.role === 'waiter' || currentPath === '/restaurant/floor') {
    return <StaffFloorPortal onNavigate={navigate} />;
  }

  // Default Restaurant dashboard - Default to 'pos' matching sample screenshot
  const restaurantTab = currentPath.startsWith('/restaurant/')
    ? currentPath.split('/')[2]
    : 'pos';

  return <RestaurantDashboard onNavigate={navigate} initialTab={restaurantTab} />;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}
