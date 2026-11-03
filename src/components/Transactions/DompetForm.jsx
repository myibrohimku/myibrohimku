import { useState, useRef, useEffect, useMemo } from 'react';
import { Wallet, X, Save } from 'lucide-react';
import SmartSearch from '../ui/SmartSearch';
import NominalInput from '../ui/NominalInput';
import Button from '../ui/Button';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabaseClient';
import './DompetForm.css';

/**
 * DompetForm — Form pengeluaran / pengambilan dana.
 * 
 * Props:
 *  - urgensiList: [{ id, label }]
 *  - jenisBayar: [{ id, label }]   — for sumber dana picker
 *  - onSuccess: () => void
 *  - onClose: () => void
 */
export default function DompetForm({
  urgensiList = [],
  jenisBayar = [],
  onSuccess,
  onClose,
}) {
  const urgensiRef = useRef(null);
  const pengambilRef = useRef(null);
  const deskripsiRef = useRef(null);
  const submitRef = useRef(null);

  // Auto-focus Urgensi on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      urgensiRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Form state
  const [selectedUrgensi, setSelectedUrgensi] = useState(null);
  const [pengambil, setPengambil] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [nominal, setNominal] = useState(0);
  const [selectedSumber, setSelectedSumber] = useState([]); // Array of jenis_bayar ids
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useApp();

  // Balance per jenis (aggregated from transaksi_pemasukan - transaksi_pengeluaran)
  const [balances, setBalances] = useState({}); // { jenis_id: totalBalance }

  // Memory for pengambil
  const pengambilMemoryKey = 'dompet-pengambil';
  const getPengambilMemory = () => {
    try {
      const raw = localStorage.getItem(`text-memory-${pengambilMemoryKey}`);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  };
  const getPengambilHint = () => {
    const mem = getPengambilMemory();
    let best = null, bestCount = 1;
    for (const [k, count] of Object.entries(mem)) {
      if (count > bestCount) { best = k; bestCount = count; }
    }
    return best;
  };
  const savePengambilMemory = (val) => {
    if (!val) return;
    const mem = getPengambilMemory();
    mem[val] = (mem[val] || 0) + 1;
    localStorage.setItem(`text-memory-${pengambilMemoryKey}`, JSON.stringify(mem));
  };

  const currentYear = new Date().getFullYear();

  // Fetch balances per jenis_bayar
  useEffect(() => {
    const fetchBalances = async () => {
      try {
        const yearStart = `${currentYear}-01-01T00:00:00.000Z`;
        const nextYearStart = `${currentYear + 1}-01-01T00:00:00.000Z`;

        // Get total income per jenis (tahun iuran berjalan)
        const { data: incomeData, error: incomeError } = await supabase
          .from('transaksi_pemasukan')
          .select('jenis_bayar, nominal')
          .eq('tahun_bayar', currentYear);
        if (incomeError) throw incomeError;

        // Get total outcome per jenis (hanya tahun berjalan, agar saldo tidak
        // mengurangi pengeluaran tahun-tahun sebelumnya)
        const { data: outcomeData, error: outcomeError } = await supabase
          .from('transaksi_pengeluaran')
          .select('sumber_dana')
          .gte('created_at', yearStart)
          .lt('created_at', nextYearStart);
        if (outcomeError) throw outcomeError;

        // Calculate income totals per jenis
        const incomeTotals = {};
        (incomeData || []).forEach(row => {
          incomeTotals[row.jenis_bayar] = (incomeTotals[row.jenis_bayar] || 0) + (Number(row.nominal) || 0);
        });

        // Calculate outcome totals per jenis
        const outcomeTotals = {};
        (outcomeData || []).forEach(row => {
          const sources = Array.isArray(row.sumber_dana) ? row.sumber_dana : [];
          sources.forEach(s => {
            outcomeTotals[s.jenis] = (outcomeTotals[s.jenis] || 0) + (Number(s.nominal) || 0);
          });
        });

        // Net balance = income - outcome
        const bal = {};
        for (const jenis of Object.keys(incomeTotals)) {
          bal[jenis] = incomeTotals[jenis] - (outcomeTotals[jenis] || 0);
        }

        setBalances(bal);
      } catch (err) {
        console.error('Error fetching balances:', err);
      }
    };

    fetchBalances();
  }, [currentYear]);

  // Group jenisBayar by prefix (ld, ks, gl, etc.) for display
  const groupedJenis = useMemo(() => {
    const groups = {};
    jenisBayar.forEach(j => {
      const prefix = j.id.replace(/\d+$/, '');
      if (!groups[prefix]) groups[prefix] = [];
      groups[prefix].push(j);
    });
    return groups;
  }, [jenisBayar]);

  // Get unique category labels (one per prefix, e.g. "Loundry", "Kas", etc.)
  const categoryLabels = useMemo(() => {
    const labels = {};
    jenisBayar.forEach(j => {
      const prefix = j.id.replace(/\d+$/, '');
      if (!labels[prefix]) {
        // Extract category name from label (remove month name)
        const parts = j.label.split(' ');
        labels[prefix] = parts.slice(0, -1).join(' ') || parts[0];
      }
    });
    return labels;
  }, [jenisBayar]);

  // Calculate total balance per category prefix
  const categoryBalances = useMemo(() => {
    const result = {};
    for (const [prefix, items] of Object.entries(groupedJenis)) {
      result[prefix] = items.reduce((sum, j) => sum + (balances[j.id] || 0), 0);
    }
    return result;
  }, [groupedJenis, balances]);

  // Select all items in a category prefix
  const toggleCategory = (prefix) => {
    const items = groupedJenis[prefix] || [];
    const isActive = items.some(j => selectedSumber.includes(j.id));
    if (isActive) {
      setSelectedSumber(prev => prev.filter(s => !items.find(j => j.id === s)));
    } else {
      const newItems = items.filter(j => !selectedSumber.includes(j.id) && (balances[j.id] || 0) > 0);
      setSelectedSumber(prev => [...prev, ...newItems.map(j => j.id)]);
    }
  };

  // Calculate total selected balance
  const totalSelectedBalance = selectedSumber.reduce((sum, id) => sum + (balances[id] || 0), 0);

  const formatRupiah = (num) => 'Rp ' + Number(num || 0).toLocaleString('id-ID');

  const handleSubmit = async (overrideSumber) => {
    const finalSumber = Array.isArray(overrideSumber) ? overrideSumber : selectedSumber;

    // Validation guards
    if (!selectedUrgensi) { addToast('Pilih urgensi terlebih dahulu!', 'error'); return; }
    if (!pengambil.trim()) { addToast('Isi siapa yang mengambil!', 'error'); return; }
    if (!deskripsi.trim()) { addToast('Isi deskripsi pengambilan!', 'error'); return; }
    if (!nominal || nominal <= 0) { addToast('Nominal harus lebih dari 0!', 'error'); return; }
    if (finalSumber.length === 0) { addToast('Pilih minimal satu sumber dana!', 'error'); return; }

    const finalTotalBalance = finalSumber.reduce((sum, id) => sum + (balances[id] || 0), 0);
    if (nominal > finalTotalBalance) { addToast('Nominal melebihi saldo yang tersedia!', 'error'); return; }

    setSubmitting(true);
    try {
      // Build sumber distribution
      let remaining = nominal;
      const sumberDistribution = [];
      for (const id of finalSumber) {
        if (remaining <= 0) break;
        const available = balances[id] || 0;
        const take = Math.min(remaining, available);
        if (take > 0) {
          sumberDistribution.push({ jenis: id, nominal: take });
          remaining -= take;
        }
      }

      const now = new Date().toISOString();
      const payload = {
        urgensi_id: selectedUrgensi.id,
        pengambil: pengambil.trim(),
        deskripsi: deskripsi.trim() || null,
        nominal,
        sumber_dana: sumberDistribution,
        created_at: now,
      };

      const { data: inserted, error } = await supabase
        .from('transaksi_pengeluaran')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      savePengambilMemory(pengambil.trim());
      addToast('Pengeluaran berhasil dicatat!', 'success');

      // Reset form
      setSelectedUrgensi(null);
      setPengambil('');
      setDeskripsi('');
      setNominal(0);
      setSelectedSumber([]);

      // Pass the real inserted record to parent → instant table update, no refetch needed
      if (inserted) onSuccess?.(inserted);
    } catch (err) {
      addToast('Gagal menyimpan: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const pengambilHint = getPengambilHint();

  return (
    <div className="dompet-form">
      <div className="dompet-form__title">
        <div className="dompet-form__title-left">
          <div className="dompet-form__title-icon">
            <Wallet size={20} />
          </div>
          Dompet
        </div>
        {onClose && (
          <button className="dompet-form__close" onClick={onClose} type="button">
            <X size={20} />
          </button>
        )}
      </div>

      <div className="dompet-form__fields">
        {/* 1. Urgensi */}
        <SmartSearch
          ref={urgensiRef}
          label="Jenis Urgensi"
          placeholder="Ketik ID atau label urgensi..."
          options={urgensiList}
          value={selectedUrgensi}
          onChange={setSelectedUrgensi}
          onConfirm={() => pengambilRef.current?.focus()}
          memoryKey="dompet-urgensi"
        />

        {/* 2. Pengambil (text with memory) */}
        <div className="dompet-form__text-group">
          <label className="dompet-form__text-label">Siapa yang Mengambil</label>
          <div className="dompet-form__text-wrap">
            <input
              ref={pengambilRef}
              type="text"
              className="dompet-form__text-input"
              placeholder="Nama pengambil..."
              value={pengambil}
              onChange={(e) => setPengambil(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (!pengambil.trim() && pengambilHint) {
                    setPengambil(pengambilHint);
                  }
                  deskripsiRef.current?.focus();
                }
              }}
            />
            {!pengambil && pengambilHint && (
              <span className="dompet-form__text-memory">↵ {pengambilHint}</span>
            )}
          </div>
        </div>

        {/* 3. Deskripsi */}
        <div className="dompet-form__text-group">
          <label className="dompet-form__text-label">Deskripsi Pengambilan</label>
          <textarea
            ref={deskripsiRef}
            className="dompet-form__text-input dompet-form__text-input--textarea"
            placeholder="Untuk apa pengambilan ini..."
            value={deskripsi}
            onChange={(e) => setDeskripsi(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                document.querySelector('.dompet-form .nominal-input__input')?.focus();
              }
            }}
          />
        </div>

        {/* 4. Nominal */}
        <NominalInput
          label="Nominal Pengambilan"
          value={nominal}
          onChange={setNominal}
          onConfirm={() => {
            const firstEnabledChip = document.querySelector('.dompet-form__sumber-chip:not(:disabled)');
            if (firstEnabledChip) {
              firstEnabledChip.focus();
            } else {
              submitRef.current?.focus();
            }
          }}
          memoryKey="dompet-nominal"
          placeholder="0"
        />

        {/* 5. Sumber Dana Picker */}
        <div className="dompet-form__sumber-section">
          <span className="dompet-form__sumber-label">Sumber Dana</span>
          <span className="dompet-form__sumber-info">
            Pilih dari mana dana diambil. Saldo tersedia: {formatRupiah(totalSelectedBalance)}
          </span>
          <div className="dompet-form__sumber-grid">
            {Object.entries(categoryBalances).map(([prefix, totalBal]) => {
              const isActive = (groupedJenis[prefix] || []).some(j => selectedSumber.includes(j.id));
              const hasBalance = totalBal > 0;
              return (
                <button
                  key={prefix}
                  className={`dompet-form__sumber-chip ${isActive ? 'dompet-form__sumber-chip--active' : ''} ${!hasBalance ? 'dompet-form__sumber-chip--disabled' : ''}`}
                  onClick={() => hasBalance && toggleCategory(prefix)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (!hasBalance) return;
                      
                      let newSelected = [...selectedSumber];
                      if (!isActive) {
                        const items = groupedJenis[prefix] || [];
                        const newItems = items.filter(j => !selectedSumber.includes(j.id) && (balances[j.id] || 0) > 0);
                        newSelected = [...newSelected, ...newItems.map(j => j.id)];
                        setSelectedSumber(newSelected);
                      }

                      // Cek kondisi keseluruhan untuk submit langsung
                      const isValid = !!selectedUrgensi && !!pengambil.trim() && !!deskripsi.trim() && nominal > 0 && newSelected.length > 0;
                      if (isValid) {
                        handleSubmit(newSelected);
                      }
                    }
                  }}
                  type="button"
                  disabled={!hasBalance}
                >
                  <span className="dompet-form__sumber-chip-name">
                    {categoryLabels[prefix] || prefix.toUpperCase()}
                  </span>
                  {hasBalance ? (
                    <span className="dompet-form__sumber-chip-balance">
                      {formatRupiah(totalBal)}
                    </span>
                  ) : (
                    <span className="dompet-form__sumber-chip-empty">Kosong</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="dompet-form__footer">
        {onClose && (
          <Button variant="ghost" icon={X} onClick={onClose}>
            Batal
          </Button>
        )}
        <Button
          ref={submitRef}
          variant={!!selectedUrgensi && !!pengambil.trim() && !!deskripsi.trim() && nominal > 0 && selectedSumber.length > 0 ? "primary" : "outline"}
          className="btn-transaction-submit flex-1"
          icon={Save}
          onClick={handleSubmit}
          disabled={submitting || !selectedUrgensi || !pengambil.trim() || !deskripsi.trim() || !nominal || selectedSumber.length === 0}
        >
          {submitting ? 'Menyimpan...' : 'Catat Pengeluaran'}
        </Button>
      </div>
    </div>
  );
}
