import { useState } from 'react';
import { Menu, Moon, Sun, Bell, User, Plus } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useApp } from '../../context/AppContext';
import { useNotifications } from '../../hooks/useNotifications';
import NotificationPanel from './NotificationPanel';
import './Navbar.css';

export default function Navbar({ onToggleSidebar, onQuickTransaction }) {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { logoUrl, user } = useApp();
  const notificationsState = useNotifications();

  return (
    <nav className="navbar" id="main-navbar">
      <div className="navbar__left">
        <button className="navbar__hamburger" onClick={onToggleSidebar} aria-label="Toggle sidebar">
          <Menu size={22} />
        </button>
        <div className="navbar__brand">
          <img src={logoUrl} alt="Logo" className="navbar__logo" />
          <span className="navbar__title">MyIbrohimku</span>
        </div>
      </div>

      <div className="navbar__right">
        {/* Tombol Quick Transaction untuk Desktop */}
        <button 
          className="navbar__quick-trx-btn"
          onClick={onQuickTransaction}
          title="Tambah Transaksi Baru"
        >
          <Plus size={18} />
          <span>Transaksi</span>
        </button>

        <button
          className="navbar__icon-btn"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          id="theme-toggle-btn"
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>

        <div style={{ position: 'relative' }}>
          <button 
            className={`navbar__icon-btn navbar__notif-btn ${isNotifOpen ? 'active' : ''}`} 
            aria-label="Notifications" 
            id="notif-btn"
            onClick={() => setIsNotifOpen(!isNotifOpen)}
          >
            <Bell size={20} />
            {notificationsState.unreadCount > 0 && (
              <span className="navbar__notif-badge">{notificationsState.unreadCount > 99 ? '99+' : notificationsState.unreadCount}</span>
            )}
          </button>

          <NotificationPanel 
            isOpen={isNotifOpen} 
            onClose={() => setIsNotifOpen(false)}
            {...notificationsState}
          />
        </div>

        <div className="navbar__user">
          <div className="navbar__avatar">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} />
            ) : (
              <User size={18} />
            )}
          </div>
          <span className="navbar__username">{user?.name || 'Admin'}</span>
        </div>
      </div>
    </nav>
  );
}
