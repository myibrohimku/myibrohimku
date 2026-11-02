import React from 'react';
import { Loader2, Save } from 'lucide-react';
import Button from '../ui/Button';
import './NominalSettings.css';

import { useNominalSettings } from '../../hooks/useNominalSettings';
import NominalHeader from './NominalSettings/NominalHeader';
import NominalMatrixTable from './NominalSettings/NominalMatrixTable';

export default function NominalSettings({ highlightedPrefix, onBack }) {
  const {
    MONTHS,
    tahun, setTahun,
    loading, saving,
    activePrefix, activeCategoryInfo,
    searchSantri, setSearchSantri, handleSearchKeyDown,
    filteredSantri,
    matrixData, originalMatrix,
    bulkInput,
    checkedSantriIds, handleToggleSantri, handleSelectAllFiltered,
    handleMatrixChange, handleBulkInputChange, handleGlobalBulkChange,
    handleSave,
    isEditingLabel, setIsEditingLabel, newLabel, setNewLabel, savingLabel, handleUpdateCategoryLabel
  } = useNominalSettings(highlightedPrefix);

  if (!activePrefix) return null;

  if (loading) {
    return (
      <div className="nominal-settings__loading animate-fade-in">
        <Loader2 className="spinner" size={24} />
        <p>Memuat data...</p>
      </div>
    );
  }

  return (
    <div className="nominal-settings-matrix animate-fade-in">
      <NominalHeader 
        onBack={onBack}
        tahun={tahun} setTahun={setTahun}
        activeCategoryInfo={activeCategoryInfo}
        isEditingLabel={isEditingLabel} setIsEditingLabel={setIsEditingLabel}
        newLabel={newLabel} setNewLabel={setNewLabel}
        savingLabel={savingLabel} handleUpdateCategoryLabel={handleUpdateCategoryLabel}
        searchSantri={searchSantri} setSearchSantri={setSearchSantri} handleSearchKeyDown={handleSearchKeyDown}
      />

      <NominalMatrixTable 
        MONTHS={MONTHS}
        filteredSantri={filteredSantri}
        checkedSantriIds={checkedSantriIds}
        handleToggleSantri={handleToggleSantri}
        handleSelectAllFiltered={handleSelectAllFiltered}
        matrixData={matrixData}
        originalMatrix={originalMatrix}
        bulkInput={bulkInput}
        handleBulkInputChange={handleBulkInputChange}
        handleGlobalBulkChange={handleGlobalBulkChange}
        handleMatrixChange={handleMatrixChange}
      />

      <div className="matrix-footer sticky">
        <div className="matrix-footer__content">
          <div className="matrix-footer__info">
             <span className="font-semibold text-text-primary">
               Tahun: {tahun} &bull; {filteredSantri.length} Santri ditampilkan
             </span>
             <p className="text-sm text-text-tertiary">
               Sel berwarna hijau menandakan data sudah tersimpan di database. Sel kuning menandakan perubahan belum disimpan.
             </p>
          </div>
          <Button
            icon={Save}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>
        </div>
      </div>
    </div>
  );
}
