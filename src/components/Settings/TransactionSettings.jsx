import { useState } from 'react';
import { Tag, Settings2, Database } from 'lucide-react';
import CategorySettings from './CategorySettings';
import NominalSettings from '../Transactions/NominalSettings';
import TransactionMaintenance from './TransactionMaintenance';
import './TransactionSettings.css';

export default function TransactionSettings() {
  const [activeSubTab, setActiveSubTab] = useState('categories'); // 'nominal' | 'categories' | 'maintenance'
  const [highlightedPrefix, setHighlightedPrefix] = useState(null);

  const handleSelectCategory = (prefix) => {
    setHighlightedPrefix(prefix);
    setActiveSubTab('nominal');
  };

  return (
    <div className="transaction-settings animate-fade-in">
      <div className="settings__section-header-main">
        <Settings2 size={24} className="text-primary-300" />
        <div>
          <h2 className="settings__section-title">Pengaturan Transaksi</h2>
          <p className="settings__hint">Kelola jenis iuran, nominal tagihan, dan pemeliharaan database.</p>
        </div>
      </div>

      {activeSubTab !== 'nominal' && (
        <div className="transaction-settings__tabs">
          <button 
            className={`transaction-settings__tab-btn ${activeSubTab === 'categories' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('categories')}
          >
            <Tag size={16} /> Kategori
          </button>
          <button 
            className={`transaction-settings__tab-btn ${activeSubTab === 'maintenance' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('maintenance')}
          >
            <Database size={16} /> Pemeliharaan
          </button>
        </div>
      )}

      <div className="transaction-settings__content">
        {activeSubTab === 'nominal' && (
          <NominalSettings 
            highlightedPrefix={highlightedPrefix} 
            onBack={() => setActiveSubTab('categories')}
          />
        )}
        {activeSubTab === 'categories' && (
          <CategorySettings onSelectCategory={handleSelectCategory} />
        )}
        {activeSubTab === 'maintenance' && (
          <TransactionMaintenance />
        )}
      </div>
    </div>
  );
}
