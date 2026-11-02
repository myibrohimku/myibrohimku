import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, Settings, ArrowLeftRight } from 'lucide-react';
import './BottomNav.css';

const navItems = [
  { label: 'Beranda', icon: LayoutDashboard, path: '/' },
  { label: 'Santri', icon: Users, path: '/data-santri' },
  // Tombol Transaksi FAB akan ada di tengah, jadi kita berikan spacer kosong di sini
  { label: 'Transaksi', icon: ArrowLeftRight, path: '/transactions', isFabPlaceholder: true },
  { label: 'Tagihan', icon: FileText, path: '/unpaid' },
  { label: 'Profil', icon: Settings, path: '/settings' },
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      <div className="bottom-nav__content">
        {navItems.map((item, idx) => {
          if (item.isFabPlaceholder) {
            return <div key={idx} className="bottom-nav__spacer" />;
          }

          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`
              }
            >
              <Icon size={22} className="bottom-nav__icon" />
              <span className="bottom-nav__label">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
