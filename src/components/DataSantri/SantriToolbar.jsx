import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus, ChevronDown, Upload, Download, FileText, FileSpreadsheet, Trash2, MoreHorizontal, Filter, CheckCheck } from 'lucide-react';
import Button from '../ui/Button';
import './SantriToolbar.css';

export default function SantriToolbar({
  searchTerm,
  onSearchChange,
  onAddSantri,
  onImportExcel,
  onExportPdf,
  onExportExcel,
  onTrashClick,
  showActiveOnly,
  onToggleActiveOnly,
  allColumns,
  visibleColumns,
  onToggleColumn,
  onToggleAllColumns
}) {
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const addMenuRef = useRef(null);
  const exportMenuRef = useRef(null);
  const moreMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (addMenuRef.current && !addMenuRef.current.contains(event.target)) {
        setIsAddMenuOpen(false);
      }
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setIsExportMenuOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setIsMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="table-controls">
    <div className="search-wrapper">
        <input
          type="text"
          placeholder="Cari nama, NIA, desa, atau kamar..."
          className="universal-search"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <Search size={16} className="search-icon" />
      </div>

      <div className="header-actions">
        {/* Split Button: Tambah Santri + Import */}
        <div className="add-split-button" ref={addMenuRef}>
          <Button
            variant="success"
            icon={Plus}
            onClick={() => {
              onAddSantri();
              setIsAddMenuOpen(false);
            }}
            className="btn-add-main"
          >
            <span className="hide-on-mobile">Tambah </span>Santri
          </Button>
          <button
            className="btn-add-arrow"
            onClick={(e) => {
              e.stopPropagation();
              setIsAddMenuOpen(!isAddMenuOpen);
            }}
            title="Opsi Tambah"
          >
            <ChevronDown size={18} />
          </button>

          {isAddMenuOpen && (
            <div className="add-menu-dropdown shadow-lg">
              <button
                className="more-menu-item"
                onClick={() => {
                  onImportExcel();
                  setIsAddMenuOpen(false);
                }}
              >
                <Upload size={15} />
                <span>Import Data Excel</span>
              </button>
            </div>
          )}
        </div>

        {/* Export Button & Dropdown */}
        <div className="export-menu-wrapper" ref={exportMenuRef}>
          <Button
            variant="outline"
            icon={Download}
            onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
            className="btn-export-trigger"
          >
            <span>Export</span>
          </Button>

          {isExportMenuOpen && (
            <div className="export-menu-dropdown shadow-lg">
              <button
                className="more-menu-item"
                onClick={() => {
                  onExportPdf();
                  setIsExportMenuOpen(false);
                }}
                type="button"
              >
                <FileText size={16} className="text-red-500" />
                <span>PDF (Preview)</span>
              </button>
              <button
                className="more-menu-item"
                onClick={() => {
                  onExportExcel();
                  setIsExportMenuOpen(false);
                }}
                type="button"
              >
                <FileSpreadsheet size={16} className="text-green-500" />
                <span>Excel</span>
              </button>
            </div>
          )}
        </div>

        {/* Trash Button */}
        <div className="toolbar-divider" />
        <button
          className="btn-more"
          onClick={onTrashClick}
          title="Tong Sampah"
        >
          <Trash2 size={18} />
        </button>

        {/* More Actions Dropdown (Table Settings) */}
        <div className="more-menu-wrapper" ref={moreMenuRef}>
          <button
            className="btn-more"
            onClick={(e) => {
              e.stopPropagation();
              setIsMoreMenuOpen(!isMoreMenuOpen);
            }}
            title="Pengaturan Tabel"
          >
            <MoreHorizontal size={20} />
          </button>

          {isMoreMenuOpen && (
            <>
              <div className="more-menu-overlay" onClick={(e) => {
                e.stopPropagation();
                setIsMoreMenuOpen(false);
              }}></div>
              <div className="more-menu-panel">
              {/* Section: Filter Status */}
              <div className="more-menu-section-label">Filter</div>
              <button
                className={`more-menu-item ${showActiveOnly ? 'more-menu-item--active' : ''}`}
                onClick={onToggleActiveOnly}
              >
                <Filter size={15} />
                <span>{showActiveOnly ? 'Hanya Aktif' : 'Semua Status'}</span>
                {showActiveOnly && <CheckCheck size={14} className="more-menu-check" />}
              </button>

              {/* Section: Kolom */}
              <div className="more-menu-section-label">Kolom Tabel</div>
              <div className="more-menu-columns">
                <label className="more-menu-item more-menu-item--header">
                  <input
                    type="checkbox"
                    checked={visibleColumns.length === allColumns.length}
                    onChange={onToggleAllColumns}
                  />
                  <span>Pilih Semua</span>
                </label>
                {allColumns.map((col) => (
                  <label key={col.key} className="more-menu-item">
                    <input
                      type="checkbox"
                      checked={visibleColumns.includes(col.key)}
                      onChange={() => onToggleColumn(col.key)}
                    />
                    <span>{col.label}</span>
                  </label>
                ))}
              </div>
            </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
