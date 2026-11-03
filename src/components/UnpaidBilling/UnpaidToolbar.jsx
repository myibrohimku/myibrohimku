import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Printer, Filter, Calendar, Tag } from 'lucide-react';
import Button from '../ui/Button';
import Dropdown from '../ui/Dropdown';

const STATUS_OPTIONS = [
  { value: 'unpaid', label: 'Belum Lunas' },
  { value: 'paid',   label: 'Sudah Lunas' },
  { value: 'all',    label: 'Semua Status' },
];

export default function UnpaidToolbar({
  searchQuery, setSearchQuery, statusFilter, setStatusFilter, handlePrintBulkPDF,
  categories, categoryPrefix, setCategoryPrefix, year, setYear, availableYears,
}) {
  const location = useLocation();
  const inputRef = useRef(null);

  useEffect(() => {
    if (location.state?.focusSearch && inputRef.current) {
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
        <div className="unpaid-filter-row">
          <div className="unpaid-filter-dropdown">
            <Dropdown
              options={STATUS_OPTIONS}
              value={statusFilter}
              onChange={setStatusFilter}
              placeholder="Belum Lunas"
              icon={Filter}
            />
          </div>
          <div className="unpaid-filter-dropdown">
            <Dropdown
              options={availableYears}
              value={year}
              onChange={setYear}
              placeholder="Pilih Tahun"
              icon={Calendar}
              disabled={availableYears.length === 0}
            />
          </div>
          <div className="unpaid-filter-dropdown">
            <Dropdown
              options={categories}
              value={categoryPrefix}
              onChange={setCategoryPrefix}
              placeholder="Kategori"
              icon={Tag}
              disabled={categories.length === 0}
            />
          </div>
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
