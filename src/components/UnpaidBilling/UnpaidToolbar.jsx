import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Printer } from 'lucide-react';
import Button from '../ui/Button';

export default function UnpaidToolbar({
  searchQuery, setSearchQuery, handlePrintBulkPDF
}) {
  const location = useLocation();
  const inputRef = useRef(null);

  useEffect(() => {
    if (location.state?.focusSearch && inputRef.lcurrent) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [location.state?.focusSearch]);

  return (
    <div className="page-header">
      <div className="page-header__main">
        <div>
          <h1 className="page-title">Daftar Tagihan Bulanan Santri</h1>
          <p className="page-subtitle">Kelola dan pantau status pembayaran santri</p>
        </div>
      </div>


      <div className="search-filter-bar mt-4">
        <div className="search-input-wrapper">
          <Search className="search-icon" size={18} />
          <input
            ref={inputRef}
            id="unpaid-search"
            type="text"
            placeholder="Cari Nama, NIA, Kamar, Bulan (Jan), atau Status (Lunas/Belum)..."
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button
          variant="primary"
          onClick={handlePrintBulkPDF}
          title="Cetak Laporan PDF Hasil Pencarian"
          style={{ whiteSpace: 'nowrap' }}
        >
          <Printer size={18} className="mr-2" /> Cetak
        </Button>
      </div>
    </div>
  );
}
