import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, AlertCircle, DollarSign, Settings, Check, X } from 'lucide-react';
import './NotificationPanel.css';

export default function NotificationPanel({
  isOpen,
  onClose,
  notifications,
  readIds,
  markAsRead,
  markAllAsRead,
  loading
}) {
  const [activeTab, setActiveTab] = useState('semua');
  const navigate = useNavigate();
  const panelRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (isOpen && panelRef.current && !panelRef.current.contains(event.target)) {
        // Only close if we're not clicking the bell button itself
        if (!event.target.closest('#notif-btn')) {
          onClose();
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const filteredNotifs = notifications.filter(n => {
    if (activeTab === 'semua') return true;
    return n.type === activeTab;
  });

  const getIcon = (type) => {
    switch (type) {
      case 'tunggakan': return <AlertCircle size={18} className="notif-icon notif-icon--red" />;
      case 'anomali': return <DollarSign size={18} className="notif-icon notif-icon--yellow" />;
      case 'sistem': return <Settings size={18} className="notif-icon notif-icon--blue" />;
      default: return <Bell size={18} className="notif-icon" />;
    }
  };

  const handleAction = (notif) => {
    markAsRead(notif.id);
    if (notif.actionUrl) {
      navigate(notif.actionUrl);
      onClose();
    }
  };

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMs / 3600000);
    const diffDays = Math.round(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} menit lalu`;
    if (diffHours < 24) return `${diffHours} jam lalu`;
    if (diffDays === 1) return 'Kemarin';
    if (diffDays < 7) return `${diffDays} hari lalu`;
    
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  if (!isOpen) return null;

  return (
    <div className="notif-panel" ref={panelRef}>
      <div className="notif-panel__header">
        <div>
          <h3 className="notif-panel__title">Notifikasi</h3>
          <p className="notif-panel__subtitle">Early Warning System</p>
        </div>
        <div className="notif-panel__actions">
          <button className="notif-panel__mark-all" onClick={markAllAsRead} title="Tandai semua dibaca">
            <Check size={16} />
          </button>
          <button className="notif-panel__close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="notif-panel__tabs">
        <button 
          className={`notif-tab ${activeTab === 'semua' ? 'active' : ''}`}
          onClick={() => setActiveTab('semua')}
        >
          Semua
        </button>
        <button 
          className={`notif-tab ${activeTab === 'tunggakan' ? 'active' : ''}`}
          onClick={() => setActiveTab('tunggakan')}
        >
          Tunggakan
        </button>
        <button 
          className={`notif-tab ${activeTab === 'sistem' ? 'active' : ''}`}
          onClick={() => setActiveTab('sistem')}
        >
          Sistem
        </button>
      </div>

      <div className="notif-panel__content">
        {loading ? (
          <div className="notif-panel__empty">
            <div className="spinner" style={{ width: 24, height: 24, borderWidth: 3 }}></div>
            <p>Memuat...</p>
          </div>
        ) : filteredNotifs.length === 0 ? (
          <div className="notif-panel__empty">
            <Bell size={32} />
            <p>Tidak ada notifikasi di kategori ini.</p>
          </div>
        ) : (
          <div className="notif-list">
            {filteredNotifs.map(notif => {
              const isRead = readIds.includes(notif.id);
              return (
                <div key={notif.id} className={`notif-item ${isRead ? 'read' : 'unread'}`}>
                  <div className="notif-item__icon-wrapper">
                    {getIcon(notif.type)}
                  </div>
                  <div className="notif-item__body">
                    <div className="notif-item__top">
                      <h4 className="notif-item__title">{notif.title}</h4>
                      <span className="notif-item__time">{formatTime(notif.date)}</span>
                    </div>
                    <p className="notif-item__message">{notif.message}</p>
                    <div className="notif-item__actions">
                      <button className="notif-btn-action" onClick={() => handleAction(notif)}>
                        Lihat Data
                      </button>
                      {!isRead && (
                        <button className="notif-btn-read" onClick={() => markAsRead(notif.id)}>
                          Tandai Dibaca
                        </button>
                      )}
                    </div>
                  </div>
                  {!isRead && <div className="notif-item__dot"></div>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
