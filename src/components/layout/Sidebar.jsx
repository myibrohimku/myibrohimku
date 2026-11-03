import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, ArrowLeftRight, FileText,
  BarChart3, Settings, LogOut
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import './Sidebar.css';

import { ShieldAlert } from 'lucide-react';

const menuItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/', permissionId: 'dashboard' },
  { label: 'Data Santri', icon: Users, path: '/data-santri', permissionId: 'santri' },
  { label: 'Transaksi', icon: ArrowLeftRight, path: '/transactions', permissionId: 'transactions' },
  { label: 'Tagihan', icon: FileText, path: '/unpaid', permissionId: 'unpaid' },
  { label: 'Laporan', icon: BarChart3, path: '/reports', permissionId: 'reports' },
  { type: 'divider' },
  { label: 'Pengaturan', icon: Settings, path: '/settings', permissionId: 'settings' },
  { label: 'Manajemen Pengguna', icon: ShieldAlert, path: '/users', adminOnly: true },
];

export default function Sidebar({ expanded, mobileOpen, isMobile, onCloseMobile }) {
  const { user, logout } = useApp();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isCollapsed = !expanded && !isMobile;
  const isVisible = isMobile ? mobileOpen : true;

  if (!isVisible) return null;

  return (
    <aside className={`sidebar ${isCollapsed ? 'sidebar--collapsed' : ''} ${isMobile ? 'sidebar--mobile' : ''}`} id="main-sidebar">
      <div className="sidebar__menu">
        {menuItems.map((item, idx) => {
          if (item.type === 'divider') {
            return <div key={idx} className="sidebar__divider" />;
          }

          if (user?.role !== 'Administrator') {
            if (item.adminOnly) return null;
            if (item.permissionId && !user?.permissions?.includes(item.permissionId)) return null;
          }

          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `sidebar__item ${isActive ? 'sidebar__item--active' : ''}`
              }
              onClick={isMobile ? onCloseMobile : undefined}
              title={isCollapsed ? item.label : undefined}
            >
              <span className="sidebar__icon">
                <Icon size={20} />
              </span>
              {!isCollapsed && <span className="sidebar__label">{item.label}</span>}
            </NavLink>
          );
        })}
      </div>

      <div className="sidebar__footer">
        <div className="sidebar__user-info">
          <div className="sidebar__user-avatar">
            {user?.avatar ? (
              <img src={user.avatar} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              user?.name?.charAt(0) || 'A'
            )}
          </div>
          {!isCollapsed && (
            <div className="sidebar__user-details">
              <span className="sidebar__user-name">{user?.name || 'Admin'}</span>
              <span className="sidebar__user-role">{user?.role || 'Administrator'}</span>
            </div>
          )}
        </div>
        <button
          className="sidebar__logout"
          onClick={handleLogout}
          title="Logout"
          id="logout-btn"
        >
          <LogOut size={18} />
          {!isCollapsed && <span>Keluar</span>}
        </button>
      </div>
    </aside>
  );
}
