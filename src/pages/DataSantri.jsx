import { useState, useEffect, useMemo, useCallback } from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import { generatePDF, generateExcel } from '../lib/reportGenerator';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabaseClient';

// UI Components
import Table from '../components/ui/Table';
import ConfirmPopup from '../components/ui/ConfirmPopup';
import SantriForm from '../components/forms/SantriForm';

// Custom Hooks
import { useMasterDataSantri } from '../hooks/useMasterDataSantri';

// Extracted Components
import SantriToolbar from '../components/DataSantri/SantriToolbar';
import SantriUploadModal from '../components/DataSantri/SantriUploadModal';
import SantriTrashModal from '../components/DataSantri/SantriTrashModal';

// Utilities & Columns
import { initialFormState, getCleanFormData, PROVINSI_OPTIONS } from '../components/DataSantri/santriUtils';
import { getSantriColumns } from '../components/DataSantri/SantriTableColumns';

import './DataSantri.css';

export default function DataSantri() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const {
    kamar: kamarOptions,
    instansi: instansiOptions,
    statusSantri: statusOptions,
    kategori: kategoriOptions,
    statusOrtu: statusOrtuOptions,
    statusBpjs: statusBpjsOptions,
    penghasilan: penghasilanOptions,
    statusSaudara: statusSaudaraOptions,
    loading: masterLoading
  } = useMasterDataSantri();
  
  const { reportSettings } = useApp();
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);
  const [isPermanentDeleteOpen, setIsPermanentDeleteOpen] = useState(false);
  const [isTrashModalOpen, setIsTrashModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Data States
  const [trashData, setTrashData] = useState([]);
  const [formData, setFormData] = useState(initialFormState);
  const [editingId, setEditingId] = useState(null);
  const [selectedSantri, setSelectedSantri] = useState(null);
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [visibleColumns, setVisibleColumns] = useState([
    'row_number', 'nia', 'nama', 'kamar', 'keterangan', 'status', 'kategori', 'instansi_pendidikan'
  ]);

  const fetchSantri = async () => {
    try {
      setLoading(true);
      const { data: santri, error } = await supabase
        .from('databasesantri')
        .select(`
          *, 
          ref_kamar(nama_kamar), 
          ref_instansi(nama_instansi), 
          ref_status_santri(nama_status),
          rel_ortu:ref_status_ortu!fk_databasesantri_status_ortu(nama_status),
          rel_keberadaan_ayah:ref_status_ortu!fk_databasesantri_keberadaan_ayah(nama_status),
          rel_keberadaan_ibu:ref_status_ortu!fk_databasesantri_keberadaan_ibu(nama_status),
          rel_bpjs:ref_status_bpjs!fk_databasesantri_status_bpjs(nama_status),
          rel_pgh_ayah:ref_penghasilan!databasesantri_penghasilan_ayah_id_fkey(rentang_penghasilan),
          rel_pgh_ibu:ref_penghasilan!databasesantri_penghasilan_ibu_id_fkey(rentang_penghasilan),
          rel_status_saudara:ref_status_saudara!databasesantri_status_saudara_id_fkey(nama_status),
          ref_kategori:ref_kategori_datasantri!kategori(nama_kategori)
        `)
        .eq('is_deleted', false)
        .order('nia', { ascending: true });
      if (error) throw error;
      setData(santri || []);
    } catch (err) {
      alert('Gagal mengambil data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrash = async () => {
    try {
      const { data: trash, error } = await supabase
        .from('databasesantri')
        .select('id, nia, nama, is_deleted')
        .eq('is_deleted', true)
        .order('nia', { ascending: true });
      if (error) throw error;
      setTrashData(trash || []);
    } catch (err) {
      console.error('Gagal mengambil data sampah:', err.message);
    }
  };

  useEffect(() => { 
    // Load santri and trash data in parallel
    Promise.all([fetchSantri(), fetchTrash()])
      .catch(err => console.error('Error loading initial data:', err));
  }, []);

  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const allColumns = useMemo(() => getSantriColumns(kategoriOptions), [kategoriOptions]);

  const columns = useMemo(() => 
    allColumns.filter(col => visibleColumns.includes(col.key)),
    [allColumns, visibleColumns]
  );

  const toggleColumn = (key) => {
    setVisibleColumns(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const toggleAllColumns = () => {
    if (visibleColumns.length === allColumns.length) {
      setVisibleColumns(['nia', 'nama']);
    } else {
      setVisibleColumns(allColumns.map(c => c.key));
    }
  };

  const handleEditClick = (santri) => {
    setEditingId(santri.id);
    setFormData(santri);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (santri) => {
    setSelectedSantri(santri);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    try {
      const { error } = await supabase
        .from('databasesantri')
        .update({ is_deleted: true })
        .eq('id', selectedSantri.id);
      
      if (error) throw error;
      alert('Data dipindahkan ke Tong Sampah');
      setIsDeleteOpen(false);
      fetchSantri();
      fetchTrash();
    } catch (err) {
      alert('Gagal memindahkan ke sampah: ' + err.message);
    }
  };

  const handleRestoreClick = (santri) => {
    setSelectedSantri(santri);
    setIsRestoreOpen(true);
  };

  const handlePermanentDeleteClick = (santri) => {
    setSelectedSantri(santri);
    setIsPermanentDeleteOpen(true);
  };

  const confirmRestore = async () => {
    try {
      const { error } = await supabase
        .from('databasesantri')
        .update({ is_deleted: false })
        .eq('id', selectedSantri.id);
      
      if (error) throw error;
      alert('Data berhasil dikembalikan!');
      setIsRestoreOpen(false);
      fetchSantri();
      fetchTrash();
    } catch (err) {
      alert('Gagal mengembalikan data: ' + err.message);
    }
  };

  const confirmPermanentDelete = async () => {
    try {
      const { error } = await supabase
        .from('databasesantri')
        .delete()
        .eq('id', selectedSantri.id);
      
      if (error) throw error;
      alert('Data berhasil dihapus permanen dari database!');
      setIsPermanentDeleteOpen(false);
      fetchTrash();
    } catch (err) {
      alert('Gagal menghapus data permanen: ' + err.message);
    }
  };

  const generateNextNIA = async () => {
    try {
      // NIA disimpan sebagai TEXT: ordering descending secara leksikografis
      // salah ketika panjang digit berbeda ("9999" > "10001"), jadi ambil
      // semua nilai lalu cari maksimum numeriknya.
      const { data: rows, error } = await supabase
        .from('databasesantri')
        .select('nia');

      if (error) throw error;

      let maxNia = 10000;
      (rows || []).forEach(row => {
        const value = parseInt(row.nia, 10);
        if (!Number.isNaN(value) && value > maxNia) maxNia = value;
      });
      return String(maxNia + 1);
    } catch (err) {
      console.error('Error generating NIA:', err);
      return null;
    }
  };

  const clearUnpaidBills = async (santriId) => {
    try {
      const { data: nominals, error: nomError } = await supabase
        .from('nominal_santri')
        .select('jenis_bayar, nominal, tahun')
        .eq('santri_id', santriId);
        
      if (nomError) throw nomError;
      if (!nominals || nominals.length === 0) return;

      const { data: payments, error: payError } = await supabase
        .from('transaksi_pemasukan')
        .select('jenis_bayar, nominal, tahun_bayar')
        .eq('santri_id', santriId);
        
      if (payError) throw payError;

      const paidMap = {};
      (payments || []).forEach(p => {
        const key = `${p.tahun_bayar}-${p.jenis_bayar}`;
        paidMap[key] = (paidMap[key] || 0) + Number(p.nominal || 0);
      });

      const recordsToDelete = [];
      nominals.forEach(n => {
        const key = `${n.tahun}-${n.jenis_bayar}`;
        const paid = paidMap[key] || 0;
        const target = Number(n.nominal || 0);
        
        if (target > 0 && paid < target) {
          recordsToDelete.push(n);
        }
      });

      for (const rec of recordsToDelete) {
        await supabase
          .from('nominal_santri')
          .update({ nominal: -1 })
          .eq('santri_id', santriId)
          .eq('jenis_bayar', rec.jenis_bayar)
          .eq('tahun', rec.tahun);
      }
      
      if (recordsToDelete.length > 0) {
        console.log(`Memutihkan ${recordsToDelete.length} tagihan belum lunas untuk santri ID ${santriId}`);
      }
    } catch (err) {
      console.error('Error saat pemutihan tagihan:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nama) {
      alert('Nama Wajib Diisi!');
      return;
    }

    try {
      const dataToSubmit = getCleanFormData(formData);

      if (!dataToSubmit.nia || (typeof dataToSubmit.nia === 'string' && !dataToSubmit.nia.trim())) {
        const newNia = await generateNextNIA();
        if (!newNia) {
          alert('Gagal membuat NIA otomatis. Silakan isi secara manual.');
          return;
        }
        dataToSubmit.nia = newNia;
      }

      if (editingId) {
        const { error } = await supabase.from('databasesantri').update(dataToSubmit).eq('id', editingId);
        if (error) throw error;
        alert('Data Santri Berhasil Diperbarui!');

        // -- LOGIKA PEMUTIHAN TAGIHAN --
        const catObj = kategoriOptions.find(o => String(o.value) === String(dataToSubmit.kategori));
        const statusObj = statusOptions.find(o => String(o.value) === String(dataToSubmit.status_id));
        
        const catLabel = (catObj?.label || '').toLowerCase();
        const statLabel = (statusObj?.label || '').toLowerCase();

        const isAlumniOrKeluar = catLabel.includes('alumni') || catLabel.includes('keluar');
        const isNonAktif = statLabel !== 'aktif';

        if (isAlumniOrKeluar || isNonAktif) {
          await clearUnpaidBills(editingId);
        }

      } else {
        const { error } = await supabase.from('databasesantri').insert([dataToSubmit]);
        if (error) throw error;
        alert('Data Santri Berhasil Disimpan!');
      }

      setIsModalOpen(false);
      setFormData(initialFormState);
      setEditingId(null);
      fetchSantri();
    } catch (err) {
      alert('Gagal menyimpan: ' + err.message);
    }
  };

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const isSearchActive = searchTerm.trim().length > 0;
      const statusName = item.ref_status_santri?.nama_status || item.status || '-';
      const q = searchTerm.toLowerCase();
      const searchKeywords = q.split(/[,\s]+/).filter(k => k.trim() !== '');
      
      // Ambil daftar status non-aktif secara dinamis dari database (kecuali 'Aktif')
      const inactiveStatusKeywords = statusOptions
        .map(opt => (opt.label || '').toLowerCase())
        .filter(label => label && label !== 'aktif');

      // Tambahkan kata kunci khusus ke dalam daftar pembuka filter (karena kadang berada di Kategori, bukan Status)
      const bypassKeywords = [...inactiveStatusKeywords, 'alumni', 'keluar'];

      // Deteksi apakah user sengaja mengetik sebagian dari status non-aktif di pencarian (minimal 3 huruf)
      const isSearchingInactiveStatus = bypassKeywords.some(bypassWord => 
        searchKeywords.some(term => term.length >= 3 && bypassWord.includes(term))
      );

      // Jika filter 'Hanya Aktif' menyala
      if (showActiveOnly && statusName.toLowerCase() !== 'aktif') {
        // Sembunyikan santri non-aktif KECUALI user sengaja mencari dengan kata kunci status non-aktif
        if (!isSearchActive || !isSearchingInactiveStatus) {
          return false;
        }
      }

      if (!isSearchActive) return true;

      // Smart Search Logic
      const qNoSpace = q.replace(/\s+/g, '');

      const getKategoriLabel = (val) => {
        return kategoriOptions.find(opt => opt.value === val || opt.value === parseInt(val))?.label || '';
      };

      const rawKamarName = item.ref_kamar?.nama_kamar || item.kamar || '';

      const searchFields = [
        item.nia,
        item.nama,
        item.desa,
        item.kecamatan,
        item.kabupaten_kota,
        item.provinsi,
        item.keterangan,
        rawKamarName,
        item.ref_status_santri?.nama_status,
        item.rel_ortu?.nama_status,
        item.rel_bpjs?.nama_status,
        getKategoriLabel(item.kategori),
        item.instansi_pendidikan,
        item.ref_instansi?.nama_instansi,
        item.no_wa_wali,
        item.nisn,
        item.nik,
        item.nama_ayah,
        item.nama_ibu,
        item.koordinat_pribadi,
        item.koordinat_saudara,
      ].filter(Boolean);

      const combinedText = searchFields.join(' ').toLowerCase();
      const combinedNoSpace = searchFields.join('').toLowerCase().replace(/\s+/g, '');

      const matchKeywords = searchKeywords.every(keyword => combinedText.includes(keyword));
      const matchFuzzy = combinedNoSpace.includes(qNoSpace);

      return matchKeywords || matchFuzzy;
    });
  }, [data, searchTerm, showActiveOnly, kategoriOptions, statusOptions]);

  const masterData = {
    kamar: kamarOptions,
    instansi: instansiOptions,
    statusSantri: statusOptions,
    kategori: kategoriOptions,
    statusOrtu: statusOrtuOptions,
    statusBpjs: statusBpjsOptions,
    penghasilan: penghasilanOptions,
    statusSaudara: statusSaudaraOptions,
    provinsiOptions: PROVINSI_OPTIONS
  };

  const handleExportPdf = () => {
    generatePDF(filteredData, columns, { 
      ...reportSettings, 
      masterData: { 
        kategori: kategoriOptions,
        status: statusOptions,
        kamar: kamarOptions,
        instansi: instansiOptions,
        statusOrtu: statusOrtuOptions
      } 
    });
  };

  const handleExportExcel = () => {
    generateExcel(filteredData, columns, { 
      ...reportSettings, 
      masterData: { 
        kategori: kategoriOptions,
        status: statusOptions,
        kamar: kamarOptions,
        instansi: instansiOptions,
        statusOrtu: statusOrtuOptions
      } 
    });
  };

  // Count active santri
  const activeCount = useMemo(() =>
    data.filter(d => (d.ref_status_santri?.nama_status || d.status || '').toLowerCase() === 'aktif').length
  , [data]);

  return (
    <div className="data-santri animate-fade-in">
      {/* ── Page Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Data Santri</h1>
          <p className="page-subtitle">Kelola dan pantau seluruh database santri secara real-time</p>
        </div>
      </div>

      {/* ── Stats Strip ── */}
      {!loading && !masterLoading && (
        <div className="stats-strip animate-fade-in">
          <span className="stat-chip stat-chip--total">
            <span className="stat-chip__dot" />
            {data.length} Total Santri
          </span>
          {searchTerm && (
            <span className="stat-chip stat-chip--filtered">
              <span className="stat-chip__dot" />
              {filteredData.length} Hasil Pencarian
            </span>
          )}
          <span className="stat-chip stat-chip--active">
            <span className="stat-chip__dot" />
            {activeCount} Aktif
          </span>
        </div>
      )}

      {/* ── Toolbar ── */}
      <SantriToolbar 
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onAddSantri={() => { setEditingId(null); setFormData(initialFormState); setIsModalOpen(true); }}
        onImportExcel={() => setIsUploadModalOpen(true)}
        onExportPdf={handleExportPdf}
        onExportExcel={handleExportExcel}
        onTrashClick={() => { fetchTrash(); setIsTrashModalOpen(true); }}
        showActiveOnly={showActiveOnly}
        onToggleActiveOnly={() => setShowActiveOnly(!showActiveOnly)}
        allColumns={allColumns}
        visibleColumns={visibleColumns}
        onToggleColumn={toggleColumn}
        onToggleAllColumns={toggleAllColumns}
      />

      {/* ── Table Card ── */}
      <div className="card shadow-md">
        {(loading || masterLoading) ? (
          <div className="loading-container">
            <div className="loading-header">
              <div className="loading-spinner-ring" />
              <span className="loading-text">Memuat data santri...</span>
            </div>
            <div className="skeleton-rows">
              {Array.from({ length: 8 }).map((_, i) => (
                <div className="skeleton-row" key={i} style={{ opacity: 1 - i * 0.1 }}>
                  <div className="skeleton-cell" style={{ width: 28, borderRadius: 6 }} />
                  <div className="skeleton-cell" style={{ width: 60 }} />
                  <div className="skeleton-cell" style={{ width: `${120 + (i % 3) * 40}px` }} />
                  <div className="skeleton-cell" style={{ width: 72, borderRadius: 999 }} />
                  <div className="skeleton-cell" style={{ width: 90 }} />
                  <div className="skeleton-cell" style={{ width: 68, borderRadius: 999 }} />
                  <div className="skeleton-cell" style={{ width: 80, borderRadius: 999 }} />
                  <div className="skeleton-cell" style={{ width: 100 }} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <Table
            columns={columns}
            data={filteredData}
            actions={(row) => (
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <button
                  className="action-btn-edit"
                  onClick={() => handleEditClick(row)}
                  title="Edit data santri"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  className="action-btn-delete"
                  onClick={() => handleDeleteClick(row)}
                  title="Hapus data santri"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          />
        )}
      </div>

      {/* Formulir Tambah/Edit Santri */}
      <SantriForm
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        formData={formData}
        onInputChange={handleInputChange}
        onSubmit={handleSubmit}
        isEditing={!!editingId}
        masterData={masterData}
      />

      <ConfirmPopup
        isOpen={isDeleteOpen}
        onCancel={() => setIsDeleteOpen(false)}
        onConfirm={confirmDelete}
        title="Hapus Data Santri"
        message={`Apakah Anda yakin ingin menghapus data ${selectedSantri?.nama}? Tindakan ini tidak dapat dibatalkan.`}
      />

      <SantriUploadModal 
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={fetchSantri}
        masterData={masterData}
      />

      <SantriTrashModal 
        isOpen={isTrashModalOpen}
        onClose={() => setIsTrashModalOpen(false)}
        trashData={trashData}
        onRestoreClick={handleRestoreClick}
        onPermanentDeleteClick={handlePermanentDeleteClick}
      />

      <ConfirmPopup
        isOpen={isRestoreOpen}
        onCancel={() => setIsRestoreOpen(false)}
        onConfirm={confirmRestore}
        title="Kembalikan Data Santri"
        message={`Apakah Anda yakin ingin mengembalikan data ${selectedSantri?.nama} ke tabel utama?`}
      />

      <ConfirmPopup
        isOpen={isPermanentDeleteOpen}
        onCancel={() => setIsPermanentDeleteOpen(false)}
        onConfirm={confirmPermanentDelete}
        title="Hapus Permanen"
        message={`Apakah Anda yakin ingin menghapus permanen data ${selectedSantri?.nama}? Tindakan ini AKAN MENGHAPUS DATA SELAMANYA dari database.`}
        confirmText="Hapus Selamanya"
        variant="danger"
      />
    </div>
  );
}
