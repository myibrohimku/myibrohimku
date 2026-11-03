import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Search, ArrowUpCircle, ArrowDownCircle, History, Banknote, CreditCard, FileUp, FileDown, Edit2, Trash2, X, Save } from 'lucide-react';
import Tabs from '../components/ui/Tabs';
import Table from '../components/ui/Table';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import PaymentForm from '../components/Transactions/PaymentForm';
import DompetForm from '../components/Transactions/DompetForm';
import ReceiptModal from '../components/Transactions/ReceiptModal';
import ConfirmPopup from '../components/ui/ConfirmPopup';
import NominalInput from '../components/ui/NominalInput';
import { useMasterTransaksi } from '../hooks/useMasterTransaksi';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabaseClient';
import { generateCombinedTransactionExcel } from '../lib/reportGenerator';
import TransactionUploadModal from '../components/Transactions/TransactionUploadModal';
import './Transactions.css';

const tabs = [
  { value: 'income', label: 'Pemasukan', icon: ArrowUpCircle },
  { value: 'outcome', label: 'Pengeluaran', icon: ArrowDownCircle },
  { value: 'history', label: 'Riwayat', icon: History },
];

const formatRupiah = (num) => 'Rp ' + Number(num || 0).toLocaleString('id-ID');

const formatDateTime = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

export default function Transactions() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('income');
  const [search, setSearch] = useState('');
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isDompetOpen, setIsDompetOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [selectedReceiptData, setSelectedReceiptData] = useState(null);
  const [selectedReceiptType, setSelectedReceiptType] = useState('income');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const { addToast, reportSettings } = useApp();

  // Data from Supabase
  const [incomeData, setIncomeData] = useState([]);
  const [outcomeData, setOutcomeData] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Edit / Delete state
  const [editRow, setEditRow] = useState(null); // row being edited
  const [editType, setEditType] = useState('income'); // 'income' | 'outcome'
  const [editFields, setEditFields] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [deleteRow, setDeleteRow] = useState(null); // row pending delete
  const [deleteType, setDeleteType] = useState('income');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { santriList, jenisBayar, kasirList, urgensiList, sumberDanaList, loading: masterLoading, refetch } = useMasterTransaksi();

  // Fetch transaction data — wrapped in useCallback to avoid stale closure
  const fetchTransactions = useCallback(async (silent = false) => {
    if (!silent) setLoadingData(true);

    const doFetchIncome = async () => {
      const { data, error } = await supabase
        .from('transaksi_pemasukan')
        .select('*, databasesantri(nama, nia, ref_kamar(nama_kamar))')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) {
        console.error('Error fetching income:', error);
      } else if (data) {
        setIncomeData(data);
      }
    };

    const doFetchOutcome = async () => {
      const { data, error } = await supabase
        .from('transaksi_pengeluaran')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) {
        console.error('Error fetching outcome:', error);
      } else if (data) {
        setOutcomeData(data);
      }
    };

    try {
      await Promise.allSettled([doFetchIncome(), doFetchOutcome()]);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      if (!silent) setLoadingData(false);
    }
  }, []); // stable — no external deps, uses setState directly

  // Keep a ref pointing to the latest fetchTransactions.
  // This is the key fix: realtime callbacks capture the ref once at mount,
  // but the ref always points to the freshest version of the function.
  const fetchTransactionsRef = useRef(fetchTransactions);
  useEffect(() => {
    fetchTransactionsRef.current = fetchTransactions;
  }, [fetchTransactions]);

  useEffect(() => {
    // Initial load
    fetchTransactionsRef.current();

    // Real-time subscriptions — use the ref so they always call the latest fn
    const channelIncome = supabase
      .channel('realtime:transaksi_pemasukan')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transaksi_pemasukan' }, () => {
        console.log('⚡ Realtime: pemasukan updated');
        fetchTransactionsRef.current(true);
      })
      .subscribe((status) => console.log('Channel income status:', status));

    const channelOutcome = supabase
      .channel('realtime:transaksi_pengeluaran')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transaksi_pengeluaran' }, () => {
        console.log('⚡ Realtime: pengeluaran updated');
        fetchTransactionsRef.current(true);
      })
      .subscribe((status) => console.log('Channel outcome status:', status));

    // Fallback polling every 30s (jika realtime tidak aktif di Supabase dashboard)
    const pollInterval = setInterval(() => {
      fetchTransactionsRef.current(true);
    }, 30000);

    return () => {
      supabase.removeChannel(channelIncome);
      supabase.removeChannel(channelOutcome);
      clearInterval(pollInterval);
    };
  }, []); // mount once — safe because we use the ref

  // Helper: get label from jenisBayar list
  const getJenisLabel = useCallback((id) => {
    return jenisBayar.find(j => j.id === id)?.label || id;
  }, [jenisBayar]);

  const getKasirLabel = (id) => {
    return kasirList.find(k => k.id === id)?.label || id;
  };

  const getUrgensiLabel = useCallback((id) => {
    return urgensiList.find(u => u.id === id)?.label || id;
  }, [urgensiList]);

  const getSumberLabel = (id, custom) => {
    const found = sumberDanaList.find(s => s.id === id);
    if (found?.kode === 'lainnya' && custom) return custom;
    return found?.label || id || '-';
  };

  // Group income data by santri_id and exact created_at
  const groupedIncomeData = useMemo(() => {
    const map = new Map();
    incomeData.forEach(item => {
      const key = `${item.santri_id}-${item.created_at}`;
      const nominal = Number(item.nominal) || 0;
      if (!map.has(key)) {
        map.set(key, {
          ...item,
          nominal,
          _is_grouped: true,
          details: [{
            jenis_bayar: item.jenis_bayar,
            nominal
          }]
        });
      } else {
        const existing = map.get(key);
        existing.nominal += nominal;
        existing.details.push({
          jenis_bayar: item.jenis_bayar,
          nominal
        });
      }
    });
    return Array.from(map.values());
  }, [incomeData]);

  // Semua baris DB yang membentuk satu baris pemasukan gabungan
  const getIncomeGroup = useCallback((row) => (
    incomeData.filter(r => r.santri_id === row.santri_id && r.created_at === row.created_at)
  ), [incomeData]);

  // Income columns
  const incomeColumns = [
    { key: 'created_at', label: 'Waktu', width: '180px', render: (v) => formatDateTime(v) },
    {
      key: 'santri', label: 'Pembayar', render: (v, item) => (
        <div>
          <div className="font-semibold">{item.databasesantri?.nama || '-'}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>NIA: {item.databasesantri?.nia || '-'}</div>
        </div>
      )
    },
    { 
      key: 'jenis_bayar', 
      label: 'Jenis', 
      render: (v, item) => (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Badge>{item.details && item.details.length > 1 ? 'Multi Pembayaran' : getJenisLabel(v)}</Badge>
          {item.tahun_bayar && (
            <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
              Tahun {item.tahun_bayar}
            </span>
          )}
        </div>
      )
    },
    { key: 'nominal', label: 'Nominal', render: (v) => <span className="amount amount--income">{formatRupiah(v)}</span> },
    { key: 'sumber_dana_id', label: 'Sumber', render: (v, item) => <Badge variant="badge--neutral">{getSumberLabel(v, item.sumber_dana_custom)}</Badge> },
    { key: 'kasir_id', label: 'Kasir', render: (v) => getKasirLabel(v) },
    { key: 'metode_bayar', label: 'Metode', render: (v) => <Badge variant={v === 'tunai' ? 'badge--yellow' : 'badge--blue'}><div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>{v === 'tunai' ? <Banknote size={14} /> : <CreditCard size={14} />} {v === 'tunai' ? 'Tunai' : 'Transfer'}</div></Badge> },
  ];

  // Income actions renderer (Edit/Hapus)
  const incomeActions = (row) => (
    <div className="table-actions">
      <button className="table-actions__btn table-actions__btn--edit" title="Edit" onClick={() => openEditModal(row, 'income')}>
        <Edit2 size={15} />
      </button>
      <button className="table-actions__btn table-actions__btn--delete" title="Hapus" onClick={() => openDeleteConfirm(row, 'income')}>
        <Trash2 size={15} />
      </button>
    </div>
  );

  // Outcome columns
  const outcomeColumns = [
    { key: 'created_at', label: 'Waktu', width: '180px', render: (v) => formatDateTime(v) },
    { key: 'pengambil', label: 'Pengambil' },
    { key: 'urgensi_id', label: 'Urgensi', render: (v) => <Badge>{getUrgensiLabel(v)}</Badge> },
    { key: 'deskripsi', label: 'Deskripsi', render: (v) => v || '-' },
    { key: 'nominal', label: 'Nominal', render: (v) => <span className="amount amount--outcome">{formatRupiah(v)}</span> },
    {
      key: 'sumber_dana', label: 'Sumber', render: (v) => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {(v || []).map((s, i) => (
            <Badge key={i} variant="badge--neutral">{getJenisLabel(s.jenis)}</Badge>
          ))}
        </div>
      )
    },
  ];

  // Outcome actions renderer (Edit/Hapus)
  const outcomeActions = (row) => (
    <div className="table-actions">
      <button className="table-actions__btn table-actions__btn--edit" title="Edit" onClick={() => openEditModal(row, 'outcome')}>
        <Edit2 size={15} />
      </button>
      <button className="table-actions__btn table-actions__btn--delete" title="Hapus" onClick={() => openDeleteConfirm(row, 'outcome')}>
        <Trash2 size={15} />
      </button>
    </div>
  );

  // History columns (combined)
  const historyData = useMemo(() => {
    const combined = [
      ...groupedIncomeData.map(i => ({
        ...i,
        _unique_id: `inc-${i.id}`,
        _type: 'income',
        _name: i.databasesantri?.nama || '-',
        _category: i.details && i.details.length > 1 ? 'Multi Pembayaran' : getJenisLabel(i.jenis_bayar)
      })),
      ...outcomeData.map(o => ({
        ...o,
        _unique_id: `out-${o.id}`,
        _type: 'outcome',
        _name: o.pengambil,
        _category: getUrgensiLabel(o.urgensi_id)
      })),
    ];
    combined.sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return (Number.isNaN(dateB) ? 0 : dateB) - (Number.isNaN(dateA) ? 0 : dateA);
    });
    return combined;
  }, [groupedIncomeData, outcomeData, getJenisLabel, getUrgensiLabel]);

  const historyColumns = [
    { key: 'created_at', label: 'Waktu', width: '180px', render: (v) => formatDateTime(v) },
    { key: '_type', label: 'Tipe', width: '100px', render: (v) => <Badge variant={v === 'income' ? 'badge--green' : 'badge--red'}>{v === 'income' ? 'Masuk' : 'Keluar'}</Badge> },
    { key: '_name', label: 'Nama/Keterangan' },
    { 
      key: '_category', 
      label: 'Kategori', 
      render: (v, item) => (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Badge>{v}</Badge>
          {item._type === 'income' && item.tahun_bayar && (
            <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
              Tahun {item.tahun_bayar}
            </span>
          )}
        </div>
      )
    },
    { key: 'nominal', label: 'Nominal', render: (v, item) => <span className={`amount amount--${item._type}`}>{formatRupiah(v)}</span> },
  ];

  // Filter data
  // Smart Search Logic
  const filterData = (rawData) => {
    if (!search.trim()) return rawData;

    const q = search.toLowerCase();
    const qNoSpace = q.replace(/\s+/g, '');
    const keywords = q.split(/[,\s]+/).filter(k => k.trim() !== '');

    return rawData.filter(item => {
      // Gabungkan label sumber dana dari array jika ada (untuk pengeluaran)
      const outcomeSources = (item.sumber_dana || [])
        .map(s => getJenisLabel(s.jenis))
        .join(' ');

      // Label tipe untuk riwayat
      const typeLabel = item._type === 'income' ? 'masuk' : (item._type === 'outcome' ? 'keluar' : '');

      // Gabungkan semua teks relevan untuk pencarian
      const searchFields = [
        item.databasesantri?.nama,
        item.databasesantri?.nia,
        getJenisLabel(item.jenis_bayar),
        getSumberLabel(item.sumber_dana_id, item.sumber_dana_custom),
        getUrgensiLabel(item.urgensi_id),
        getKasirLabel(item.kasir_id),
        outcomeSources,
        item.metode_bayar,
        item.sumber_dana_custom,
        item.pengambil,
        item.deskripsi,
        item._name,
        item._category,
        typeLabel
      ].filter(Boolean);

      const combinedText = searchFields.join(' ').toLowerCase();
      const combinedNoSpace = searchFields.join('').toLowerCase().replace(/\s+/g, '');

      const matchKeywords = keywords.every(keyword => combinedText.includes(keyword));
      const matchFuzzy = combinedNoSpace.includes(qNoSpace);

      return matchKeywords || matchFuzzy;
    });
  };

  const getActiveData = () => {
    if (activeTab === 'income') return filterData(groupedIncomeData);
    if (activeTab === 'outcome') return filterData(outcomeData);
    return filterData(historyData);
  };



  const getActiveColumns = () => {
    if (activeTab === 'income') return incomeColumns;
    if (activeTab === 'outcome') return outcomeColumns;
    return historyColumns;
  };

  const handleAddClick = () => {
    refetch(); // Refresh master data in case new categories were added
    if (activeTab === 'outcome') {
      setIsDompetOpen(true);
    } else {
      setIsPaymentOpen(true);
    }
  };

  const handleRowClick = (row) => {
    const type = activeTab === 'outcome'
      ? 'outcome'
      : activeTab === 'history'
        ? row._type
        : 'income';

    setSelectedReceiptType(type);
    setSelectedReceiptData(row);
    setIsReceiptOpen(true);
  };

  // Called by PaymentForm — optimistic: prepend inserted records immediately
  const handleIncomeSuccess = useCallback((newRecords) => {
    if (Array.isArray(newRecords) && newRecords.length > 0) {
      setIncomeData(prev => [...newRecords, ...prev]);
    }
    // Sync silently in background
    fetchTransactionsRef.current(true);
  }, []);

  // Called by DompetForm — optimistic: prepend the record immediately, no wait
  const handleOutcomeSuccess = useCallback((newRecord) => {
    if (newRecord) {
      setOutcomeData(prev => [newRecord, ...prev]);
    }
    // Sync with server silently in background
    fetchTransactionsRef.current(true);
  }, []);

  // ─── Edit / Delete Handlers ───
  const openEditModal = (row, type) => {
    setEditType(type);
    setEditRow(row);
    if (type === 'income') {
      setEditFields({
        nominal: row.nominal || 0,
        metode_bayar: row.metode_bayar || 'tunai',
        sumber_dana_id: row.sumber_dana_id || null,
        sumber_dana_custom: row.sumber_dana_custom || '',
        kasir_id: row.kasir_id || null,
      });
    } else {
      setEditFields({
        nominal: row.nominal || 0,
        pengambil: row.pengambil || '',
        deskripsi: row.deskripsi || '',
        urgensi_id: row.urgensi_id || null,
      });
    }
  };

  const openDeleteConfirm = (row, type) => {
    setDeleteType(type);
    setDeleteRow(row);
  };

  const handleEditSave = async () => {
    if (!editRow) return;

    const nominal = Math.round(Number(editFields.nominal) || 0);
    if (nominal <= 0) {
      addToast('Nominal harus lebih dari 0!', 'error');
      return;
    }

    setEditSaving(true);
    try {
      if (editType === 'income') {
        const group = getIncomeGroup(editRow);
        const sharedFields = {
          metode_bayar: editFields.metode_bayar,
          sumber_dana_id: editFields.sumber_dana_id,
          sumber_dana_custom: editFields.sumber_dana_custom,
          kasir_id: editFields.kasir_id,
        };

        if (group.length > 1) {
          // Satu baris tabel = beberapa baris DB (multi pembayaran).
          // Field bersama diubah untuk semua baris, nominal total dibagi proporsional.
          const ids = group.map(r => r.id);
          const { error: sharedError } = await supabase
            .from('transaksi_pemasukan')
            .update(sharedFields)
            .in('id', ids);
          if (sharedError) throw sharedError;

          const oldTotal = group.reduce((sum, r) => sum + (Number(r.nominal) || 0), 0);
          if (nominal !== oldTotal) {
            let allocated = 0;
            const updates = group.map((r, index) => {
              const isLast = index === group.length - 1;
              const rowNominal = isLast
                ? nominal - allocated
                : oldTotal > 0
                  ? Math.floor(((Number(r.nominal) || 0) / oldTotal) * nominal)
                  : Math.floor(nominal / group.length);
              allocated += rowNominal;
              return supabase
                .from('transaksi_pemasukan')
                .update({ nominal: Math.max(0, rowNominal) })
                .eq('id', r.id);
            });
            const results = await Promise.all(updates);
            const failed = results.find(r => r.error);
            if (failed) throw failed.error;
          }
        } else {
          const { error } = await supabase
            .from('transaksi_pemasukan')
            .update({ ...sharedFields, nominal })
            .eq('id', editRow.id);
          if (error) throw error;
        }
      } else {
        const { error } = await supabase
          .from('transaksi_pengeluaran')
          .update({ ...editFields, nominal })
          .eq('id', editRow.id);
        if (error) throw error;
      }

      addToast('Data berhasil diperbarui!', 'success');
      setEditRow(null);
      fetchTransactionsRef.current(true);
    } catch (err) {
      addToast('Gagal menyimpan: ' + err.message, 'error');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteRow) return;
    setDeleteLoading(true);
    try {
      if (deleteType === 'income') {
        // Hapus seluruh baris DB dalam grup, bukan hanya baris pertama.
        const ids = getIncomeGroup(deleteRow).map(r => r.id);
        const { error } = await supabase
          .from('transaksi_pemasukan')
          .delete()
          .in('id', ids.length > 0 ? ids : [deleteRow.id]);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('transaksi_pengeluaran')
          .delete()
          .eq('id', deleteRow.id);
        if (error) throw error;
      }
      addToast('Data berhasil dihapus!', 'success');
      setDeleteRow(null);
      fetchTransactionsRef.current(true);
    } catch (err) {
      addToast('Gagal menghapus: ' + err.message, 'error');
    } finally {
      setDeleteLoading(false);
    }
  };


  // Baca router state dari Ctrl+I / Ctrl+O shortcut (dikirim oleh Shell.jsx)
  // Setelah dibaca, bersihkan state agar refresh tidak re-trigger form
  useEffect(() => {
    const form = location.state?.openForm;
    if (!form) return;

    if (form === 'income') {
      setTimeout(() => {
        setActiveTab('income');
        setIsDompetOpen(false);
        setIsPaymentOpen(true);
      }, 0);
    } else if (form === 'outcome') {
      setTimeout(() => {
        setActiveTab('outcome');
        setIsPaymentOpen(false);
        setIsDompetOpen(true);
      }, 0);
    }

    // Hapus state dari history agar refresh tidak membuka form lagi
    navigate('/transactions', { replace: true, state: {} });
  }, [location.state, navigate]);

  return (
    <div className="transactions animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Transaksi</h1>
          <p className="page-subtitle">Catatan keuangan MyIbrohimku</p>
        </div>
        <div className="page-header__actions">
          <Button variant="outline" icon={FileDown} onClick={() => setIsUploadOpen(true)}>Import Excel</Button>
          <Button variant="outline" icon={FileUp} onClick={() => {
            const currentIncome = activeTab === 'income' || activeTab === 'history' ? incomeData : [];
            const currentOutcome = activeTab === 'outcome' || activeTab === 'history' ? outcomeData : [];
            generateCombinedTransactionExcel(currentIncome, currentOutcome, {
              ...reportSettings,
              masterData: { jenisBayar, kasirList, urgensiList, sumberDanaList }
            });
          }}>Export Excel</Button>
          <Button icon={Plus} onClick={handleAddClick}>
            <span className="hide-on-mobile">Tambah </span>
            {activeTab === 'outcome' ? 'Pengeluaran' : 'Transaksi'}
          </Button>
        </div>
      </div>

      <div className="card card--padded transactions__header">
        <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
        <div className="transactions__search-bar">
          <Input
            placeholder="Cari transaksi..."
            icon={Search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="card shadow-md">
        {loadingData || masterLoading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Memuat data transaksi...</p>
          </div>
        ) : (
          <Table
            columns={getActiveColumns()}
            data={getActiveData()}
            onRowClick={handleRowClick}
            actions={activeTab === 'income' ? incomeActions : activeTab === 'outcome' ? outcomeActions : undefined}
          />
        )}
      </div>

      {/* Payment Form Modal */}
      <Modal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        title=""
        maxWidth="650px"
        bodyClassName="modal-body--no-padding"
      >
        <PaymentForm
          santriList={santriList}
          jenisBayar={jenisBayar}
          kasirList={kasirList}
          sumberDanaList={sumberDanaList}
          onSuccess={(newRecords) => {
            handleIncomeSuccess(newRecords);
            setIsPaymentOpen(false);
          }}
          onClose={() => setIsPaymentOpen(false)}
        />
      </Modal>

      {/* Dompet Form Modal */}
      <Modal
        isOpen={isDompetOpen}
        onClose={() => setIsDompetOpen(false)}
        title=""
        maxWidth="650px"
        bodyClassName="modal-body--no-padding"
      >
        <DompetForm
          urgensiList={urgensiList}
          jenisBayar={jenisBayar}
          onSuccess={(newRecord) => {
            handleOutcomeSuccess(newRecord);
            setIsDompetOpen(false);
          }}
          onClose={() => setIsDompetOpen(false)}
        />
      </Modal>

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        data={selectedReceiptData}
        type={selectedReceiptType}
        masterData={{ jenisBayar, kasirList, urgensiList, sumberDanaList }}
      />

      {/* Upload Modal */}
      <TransactionUploadModal 
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={() => fetchTransactions(true)}
        type={activeTab === 'outcome' ? 'outcome' : 'income'}
        masterData={{ jenisBayar, kasirList, urgensiList, sumberDanaList }}
      />

      {/* Edit Transaction Modal */}
      <Modal
        isOpen={!!editRow}
        onClose={() => setEditRow(null)}
        title={editType === 'income' ? 'Edit Pemasukan' : 'Edit Pengeluaran'}
        maxWidth="480px"
      >
        {editRow && editType === 'income' && (
          <div className="edit-form">
            <div className="edit-form__group">
              <label className="edit-form__label">Nominal</label>
              <NominalInput
                value={editFields.nominal || 0}
                onChange={(val) => setEditFields(prev => ({ ...prev, nominal: val }))}
              />
            </div>
            <div className="edit-form__group">
              <label className="edit-form__label">Metode Bayar</label>
              <div className="edit-form__toggle">
                <button
                  className={`edit-form__toggle-btn ${editFields.metode_bayar === 'tunai' ? 'edit-form__toggle-btn--active' : ''}`}
                  onClick={() => setEditFields(prev => ({ ...prev, metode_bayar: 'tunai' }))}
                ><Banknote size={16} /> Tunai</button>
                <button
                  className={`edit-form__toggle-btn ${editFields.metode_bayar === 'transfer' ? 'edit-form__toggle-btn--active' : ''}`}
                  onClick={() => setEditFields(prev => ({ ...prev, metode_bayar: 'transfer' }))}
                ><CreditCard size={16} /> Transfer</button>
              </div>
            </div>
            <div className="edit-form__group">
              <label className="edit-form__label">Sumber Dana</label>
              <div className="edit-form__chips">
                {sumberDanaList.map(s => (
                  <button
                    key={s.id}
                    className={`edit-form__chip ${editFields.sumber_dana_id === s.id ? 'edit-form__chip--active' : ''}`}
                    onClick={() => setEditFields(prev => ({ ...prev, sumber_dana_id: s.id }))}
                  >{s.label}</button>
                ))}
              </div>
              {sumberDanaList.find(s => s.id === editFields.sumber_dana_id)?.kode === 'lainnya' && (
                <input
                  type="text"
                  className="edit-form__input"
                  placeholder="Sumber dana lainnya..."
                  value={editFields.sumber_dana_custom || ''}
                  onChange={(e) => setEditFields(prev => ({ ...prev, sumber_dana_custom: e.target.value }))}
                />
              )}
            </div>
            <div className="edit-form__group">
              <label className="edit-form__label">Kasir</label>
              <div className="edit-form__chips">
                {kasirList.map(k => (
                  <button
                    key={k.id}
                    className={`edit-form__chip ${editFields.kasir_id === k.id ? 'edit-form__chip--active' : ''}`}
                    onClick={() => setEditFields(prev => ({ ...prev, kasir_id: k.id }))}
                  >{k.label}</button>
                ))}
              </div>
            </div>
            <div className="edit-form__footer">
              <Button variant="ghost" icon={X} onClick={() => setEditRow(null)}>Batal</Button>
              <Button icon={Save} onClick={handleEditSave} disabled={editSaving}>
                {editSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </div>
          </div>
        )}

        {editRow && editType === 'outcome' && (
          <div className="edit-form">
            <div className="edit-form__group">
              <label className="edit-form__label">Nominal</label>
              <NominalInput
                value={editFields.nominal || 0}
                onChange={(val) => setEditFields(prev => ({ ...prev, nominal: val }))}
              />
            </div>
            <div className="edit-form__group">
              <label className="edit-form__label">Pengambil</label>
              <input
                type="text"
                className="edit-form__input"
                value={editFields.pengambil || ''}
                onChange={(e) => setEditFields(prev => ({ ...prev, pengambil: e.target.value }))}
              />
            </div>
            <div className="edit-form__group">
              <label className="edit-form__label">Deskripsi</label>
              <textarea
                className="edit-form__input edit-form__input--textarea"
                value={editFields.deskripsi || ''}
                onChange={(e) => setEditFields(prev => ({ ...prev, deskripsi: e.target.value }))}
              />
            </div>
            <div className="edit-form__group">
              <label className="edit-form__label">Urgensi</label>
              <div className="edit-form__chips">
                {urgensiList.map(u => (
                  <button
                    key={u.id}
                    className={`edit-form__chip ${editFields.urgensi_id === u.id ? 'edit-form__chip--active' : ''}`}
                    onClick={() => setEditFields(prev => ({ ...prev, urgensi_id: u.id }))}
                  >{u.label}</button>
                ))}
              </div>
            </div>
            <div className="edit-form__footer">
              <Button variant="ghost" icon={X} onClick={() => setEditRow(null)}>Batal</Button>
              <Button icon={Save} onClick={handleEditSave} disabled={editSaving}>
                {editSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmPopup
        isOpen={!!deleteRow}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteRow(null)}
        title="Hapus Transaksi"
        message={
          deleteRow && deleteType === 'income' && getIncomeGroup(deleteRow).length > 1
            ? `Transaksi ini terdiri dari ${getIncomeGroup(deleteRow).length} pembayaran. Semua baris tersebut akan dihapus dan tidak dapat dikembalikan.`
            : 'Yakin ingin menghapus transaksi ini? Data yang dihapus tidak dapat dikembalikan.'
        }
        confirmText={deleteLoading ? 'Menghapus...' : 'Ya, Hapus'}
      />
    </div>
  );
}
