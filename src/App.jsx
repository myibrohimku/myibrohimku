import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useApp } from './context/AppContext';
import Shell from './components/layout/Shell';
import ToastContainer from './components/ui/Toast.jsx';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DataSantri from './pages/DataSantri';
import Transactions from './pages/Transactions';
import UnpaidBilling from './pages/UnpaidBilling';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import UsersManagement from './pages/UsersManagement';

const ProtectedRoute = ({ children, requiredPermission }) => {
  const { user } = useApp();
  
  if (user?.role === 'Administrator') return children;
  
  if (requiredPermission && !user?.permissions?.includes(requiredPermission)) {
    return (
      <div className="animate-fade-in" style={{ padding: '2rem', textAlign: 'center', marginTop: '10vh' }}>
        <h2 style={{ color: 'var(--danger-color)' }}>Akses Ditolak</h2>
        <p>Anda tidak memiliki izin untuk membuka halaman ini.</p>
      </div>
    );
  }
  
  return children;
};

export default function App() {
  const { user, authLoading } = useApp();
  const location = useLocation();

  // Tampilkan splash screen saat mengecek sesi ke Supabase
  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        color: 'rgba(255,255,255,0.7)',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div className="spinner" />
        <p>Memverifikasi sesi...</p>
      </div>
    );
  }

  // Protected Route Logic
  if (!user && location.pathname !== '/login') {
    return <Navigate to="/login" replace />;
  }

  if (user && location.pathname === '/login') {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* All Admin Routes Wrapped in Shell */}
        <Route path="/" element={<Shell><ProtectedRoute requiredPermission="dashboard"><Dashboard /></ProtectedRoute></Shell>} />
        <Route path="/data-santri" element={<Shell><ProtectedRoute requiredPermission="santri"><DataSantri /></ProtectedRoute></Shell>} />
        <Route path="/transactions" element={<Shell><ProtectedRoute requiredPermission="transactions"><Transactions /></ProtectedRoute></Shell>} />

        <Route path="/unpaid" element={<Shell><ProtectedRoute requiredPermission="unpaid"><UnpaidBilling /></ProtectedRoute></Shell>} />
        <Route path="/reports" element={<Shell><ProtectedRoute requiredPermission="reports"><Reports /></ProtectedRoute></Shell>} />
        <Route path="/settings" element={<Shell><ProtectedRoute requiredPermission="settings"><Settings /></ProtectedRoute></Shell>} />
        <Route path="/users" element={<Shell><ProtectedRoute><UsersManagement /></ProtectedRoute></Shell>} />

        
        {/* 404 Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      
      <ToastContainer />
    </>
  );
}
