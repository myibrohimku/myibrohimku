import React from 'react';
import { ArrowLeft, Check, X, Edit2, Search } from 'lucide-react';
import Badge from '../../ui/Badge';

export default function NominalHeader({
  onBack,
  tahun, setTahun,
  activeCategoryInfo,
  isEditingLabel, setIsEditingLabel,
  newLabel, setNewLabel,
  savingLabel, handleUpdateCategoryLabel,
  searchSantri, setSearchSantri, handleSearchKeyDown
}) {
  return (
    <div className="matrix-header">
      <div className="matrix-header__title-block">
        <button className="matrix-back-btn" onClick={onBack} title="Kembali ke Daftar">
          <ArrowLeft size={20} />
        </button>
        
        {isEditingLabel ? (
          <form onSubmit={handleUpdateCategoryLabel} className="matrix-header__edit-form">
            <input 
              className="matrix-header__edit-input"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              autoFocus
              required
            />
            <div className="matrix-header__edit-actions">
              <button type="submit" disabled={savingLabel} className="btn-icon-save" title="Simpan">
                <Check size={16} />
              </button>
              <button type="button" onClick={() => setIsEditingLabel(false)} className="btn-icon-cancel" title="Batal">
                <X size={16} />
              </button>
            </div>
          </form>
        ) : (
          <div className="matrix-header__title-wrapper">
            <h3 className="matrix-header__title">
              <span className="text-primary-300">{activeCategoryInfo?.label}</span>
            </h3>
            <button 
              className="matrix-edit-label-btn" 
              onClick={() => {
                setNewLabel(activeCategoryInfo?.label || '');
                setIsEditingLabel(true);
              }}
              title="Edit Nama Kategori"
            >
              <Edit2 size={14} />
            </button>
            <Badge variant="secondary">Tahun {tahun}</Badge>
          </div>
        )}
      </div>
      
      <div className="matrix-header__controls">
        <div className="matrix-year-control">
          <button onClick={() => setTahun(t => t - 1)}>←</button>
          <span>{tahun}</span>
          <button onClick={() => setTahun(t => t + 1)}>→</button>
        </div>
        
        <div className="matrix-search">
          <Search size={16} />
          <input 
            type="text" 
            placeholder="Cari santri..." 
            value={searchSantri}
            onChange={(e) => setSearchSantri(e.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
        </div>
      </div>
    </div>
  );
}
