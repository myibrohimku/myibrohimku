import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import { Plus } from 'lucide-react';
import { useMasterTransaksi } from '../../hooks/useMasterTransaksi';
import './Shell.css';

export default function Shell({ children }) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const { refetch } = useMasterTransaksi();

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      setIsMobile(w < 768);
      if (w < 768) {
        setSidebarOpen(false);
      } else if (w <= 1024) {
        setSidebarOpen(false); // collapsed on tablet
      } else {
        setSidebarOpen(true);
        setMobileMenuOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard Shortcuts — navigate ke /transactions dengan state agar
  // Transactions.jsx bisa buka tab + form yang tepat
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl + I → Pemasukan (PaymentForm)
      if (e.ctrlKey && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        refetch();
        navigate('/transactions', { state: { openForm: 'income' } });
      }
      // Ctrl + O → Pengeluaran (DompetForm)
      if (e.ctrlKey && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        refetch();
        navigate('/transactions', { state: { openForm: 'outcome' } });
      }
      // Alt + T → Tagihan (UnpaidBilling)
      if (e.altKey && (e.key.toLowerCase() === 't' || e.code === 'KeyT')) {
        e.preventDefault();
        // Gunakan timestamp agar selalu memicu efek walaupun user sudah berada di halaman tagihan
        navigate('/unpaid', { state: { focusSearch: Date.now() } });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [refetch, navigate]);

  const toggleSidebar = () => {
    if (isMobile) {
      setMobileMenuOpen(prev => !prev);
    } else {
      setSidebarOpen(prev => !prev);
    }
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const handleQuickTransaction = () => {
    refetch();
    navigate('/transactions', { state: { openForm: 'income' } });
  };

  return (
    <div className="shell">
      <Navbar onToggleSidebar={toggleSidebar} onQuickTransaction={handleQuickTransaction} />
      <div className="shell__body">
        <Sidebar
          expanded={sidebarOpen}
          mobileOpen={mobileMenuOpen}
          isMobile={isMobile}
          onCloseMobile={closeMobileMenu}
        />
        {mobileMenuOpen && isMobile && (
          <div className="shell__overlay" onClick={closeMobileMenu} />
        )}
        <main
          className="shell__main"
          style={{
            marginLeft: isMobile ? 0 : sidebarOpen ? 'var(--sidebar-width)' : 'var(--sidebar-collapsed-width)'
          }}
        >
          {children}
        </main>
      </div>

      {/* Floating Action Button (FAB) untuk Mobile */}
      {isMobile && (
        <button 
          className="shell__fab" 
          onClick={handleQuickTransaction}
          aria-label="Tambah Transaksi"
        >
          <Plus size={28} />
        </button>
      )}

      {/* Bottom Navigation untuk Mobile */}
      <BottomNav />
    </div>
  );
}
