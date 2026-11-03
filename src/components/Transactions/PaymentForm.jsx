import { useState, useRef, useEffect, useCallback } from 'react';
import { DollarSign, X, Save, Banknote, CreditCard } from 'lucide-react';
import SmartSearch from '../ui/SmartSearch';
import NominalInput from '../ui/NominalInput';
import Button from '../ui/Button';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabaseClient';
import './PaymentForm.css';

/**
 * PaymentForm — Form pemasukan transaksi.
 */
export default function PaymentForm({
  santriList = [],
  jenisBayar = [],
  kasirList = [],
  sumberDanaList = [],
  onSuccess,
  onClose,
}) {
  const santriRef = useRef(null);
  const jenisRef = useRef(null);
  const kasirRef = useRef(null);
  const submitRef = useRef(null);

  // Form state
  const [selectedSantri, setSelectedSantri] = useState(null);
  const [selectedJenis, setSelectedJenis] = useState([]);
  const [nominals, setNominals] = useState({});
  const [selectedKasir, setSelectedKasir] = useState(null);
  const [sumberDana, setSumberDana] = useState(null);
  const [sumberDanaCustom, setSumberDanaCustom] = useState('');
  const [metodeBayar, setMetodeBayar] = useState(null);
  const [paidAmounts, setPaidAmounts] = useState({});
  const [targetNominals, setTargetNominals] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useApp();

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [availableYears, setAvailableYears] = useState([]);

  // Auto-focus Santri on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      santriRef.current?.focus();
    }, 10);
    return () => clearTimeout(timer);
  }, []);

  // Check for duplicate payments, fetch targets, AND fetch available years
  useEffect(() => {
    const fetchData = async () => {
      if (!selectedSantri) {
        setPaidAmounts({});
        setTargetNominals({});
        setAvailableYears([]);
        return;
      }
      try {
        const [resDup, resTarget, resYears] = await Promise.all([
          supabase.from('transaksi_pemasukan').select('jenis_bayar, nominal').eq('santri_id', selectedSantri.santri_id).eq('tahun_bayar', selectedYear),
          supabase.from('nominal_santri').select('jenis_bayar, nominal').eq('santri_id', selectedSantri.santri_id).eq('tahun', selectedYear),
          supabase.from('nominal_santri').select('tahun').eq('santri_id', selectedSantri.santri_id)
        ]);

        if (resDup.data) {
          const paid = {};
          resDup.data.forEach(d => {
            const jid = (d.jenis_bayar || '').toLowerCase();
            paid[jid] = (paid[jid] || 0) + Number(d.nominal);
          });
          setPaidAmounts(paid);
        }
        
        if (resTarget.data) {
          const targets = {};
          resTarget.data.forEach(t => { targets[(t.jenis_bayar || '').toLowerCase()] = t.nominal; });
          setTargetNominals(targets);
        }

        if (resYears.data) {
          const years = [...new Set(resYears.data.map(d => d.tahun))].sort((a, b) => a - b);
          setAvailableYears(years);
        }
      } catch (err) { console.error('Error fetching data:', err); }
    };
    fetchData();
  }, [selectedSantri, selectedYear]);

  // Reset jenis & nominals when year changes
  const handleYearChange = (delta, force = false) => {
    const nextYear = selectedYear + delta;
    // Safety check: hanya tahun yang punya pengaturan nominal, kecuali reset paksa
    if (!force && selectedSantri && !availableYears.includes(nextYear)) return;

    setSelectedYear(nextYear);
    setSelectedJenis([]);
    setNominals({});
    setPaidAmounts({});
  };

  // Ganti santri harus mereset jenis & nominal agar tidak memakai nilai santri sebelumnya
  const handleSantriChange = (santri) => {
    setSelectedSantri(santri);
    setSelectedJenis([]);
    setNominals({});
    setPaidAmounts({});
    setTargetNominals({});
  };

  const handleAddJenis = useCallback((opt) => {
    if (!opt || selectedJenis.find(j => j.id === opt.id)) return;
    setSelectedJenis(prev => [...prev, opt]);
    const target = targetNominals[(opt.id || '').toLowerCase()] || 0;
    if (target > 0) {
      setNominals(prev => ({ ...prev, [opt.id]: target }));
    }
  }, [selectedJenis, targetNominals]);

  const handleRemoveJenis = (jenisId) => {
    setSelectedJenis(prev => prev.filter(j => j.id !== jenisId));
    setNominals(prev => {
      const next = { ...prev };
      delete next[jenisId];
      return next;
    });
  };

  const handleNominalChange = (jenisId, value) => {
    setNominals(prev => ({ ...prev, [jenisId]: value }));
  };

  const getSumberKode = (id) => sumberDanaList.find(s => s.id === id)?.kode || 'orangtua';

  const handleSubmit = async (sumberOverride, metodeOverride) => {
    // Guard: when called from onClick, first arg is a SyntheticEvent — ignore it
    if (sumberOverride?.nativeEvent || sumberOverride?.target) {
      sumberOverride = undefined;
      metodeOverride = undefined;
    }
    const sId = sumberOverride !== undefined ? sumberOverride : sumberDana;
    const mId = metodeOverride !== undefined ? metodeOverride : metodeBayar;

    if (!selectedSantri) return addToast('Pilih Nama / NIA Pembayar terlebih dahulu!', 'error');
    if (selectedJenis.length === 0) return addToast('Pilih minimal satu Jenis Pembayaran!', 'error');
    if (!selectedKasir) return addToast('Pilih Kasir yang bertugas!', 'error');
    if (!sId) return addToast('Pilih Sumber Dana terlebih dahulu!', 'error');
    if (!mId) return addToast('Pilih Metode Pembayaran terlebih dahulu!', 'error');

    const records = selectedJenis.filter(j => {
      const jid = (j.id || '').toLowerCase();
      const paid = paidAmounts[jid] || 0;
      const target = targetNominals[jid] || 0;
      const isLunas = target > 0 && paid >= target;
      const isCleared = target === -1;
      return !isLunas && !isCleared;
    }).map(j => ({
      santri_id: selectedSantri.santri_id,
      jenis_bayar: j.id,
      nominal: Math.round(Number(nominals[j.id]) || 0),
      kasir_id: selectedKasir.id,
      sumber_dana_id: sId,
      sumber_dana_custom: getSumberKode(sId) === 'lainnya' ? (sumberDanaCustom || 'Lainnya') : null,
      metode_bayar: mId,
      tahun_bayar: selectedYear,
      created_at: new Date().toISOString(),
    })).filter(r => r.nominal > 0);

    // Jangan pernah mengirim insert kosong atau nominal nol
    if (records.length === 0) {
      return addToast(
        selectedJenis.length > 0
          ? 'Nominal pembayaran harus lebih dari 0!'
          : 'Semua jenis pembayaran yang dipilih sudah lunas atau dihapus.',
        'error'
      );
    }

    setSubmitting(true);
    try {
      const { data: inserted, error } = await supabase
        .from('transaksi_pemasukan')
        .insert(records)
        .select('*, databasesantri(nama, nia)');
      if (error) throw error;
      addToast('Pemasukan berhasil dicatat!', 'success');

      // Reset form
      setSelectedSantri(null);
      setSelectedJenis([]);
      setNominals({});
      setSelectedKasir(null);
      setSumberDana(null);
      setMetodeBayar(null);
      setSumberDanaCustom('');

      // Pass inserted records → parent prepends them instantly
      onSuccess?.(inserted ?? records);
    } catch (err) { addToast('Gagal: ' + err.message, 'error'); }
    finally { setSubmitting(false); }
  };


  return (
    <div className="payment-form">
      <div className="payment-form__title">
        <div className="payment-form__title-left"><div className="payment-form__title-icon"><DollarSign size={20} /></div>Payment</div>
        {onClose && <button className="payment-form__close" onClick={onClose}><X size={20} /></button>}
      </div>

      <div className="payment-form__fields">
        <SmartSearch
          ref={santriRef}
          label="Nama / NIA Pembayar"
          options={santriList}
          value={selectedSantri}
          onChange={handleSantriChange}
          onConfirm={() => jenisRef.current?.querySelector('input')?.focus()}
        />

        {/* Year Selector */}
        <div className="payment-form__year-selector">
          <div className="payment-form__year-label">
            <span>Tahun Iuran</span>
            {selectedYear !== currentYear && (
              <span className="payment-form__year-badge">⚠ Tahun berbeda dari sekarang</span>
            )}
          </div>
          <div className="payment-form__year-control">
            <button
              type="button"
              className="payment-form__year-btn"
              onClick={() => handleYearChange(-1)}
              disabled={!selectedSantri || !availableYears.includes(selectedYear - 1)}
              title="Tahun sebelumnya"
            >←</button>
            <span className="payment-form__year-value">{selectedYear}</span>
            <button
              type="button"
              className="payment-form__year-btn"
              onClick={() => handleYearChange(1)}
              disabled={!selectedSantri || !availableYears.includes(selectedYear + 1)}
              title="Tahun berikutnya"
            >→</button>
            {selectedYear !== currentYear && (
              <button
                type="button"
                className="payment-form__year-reset"
                onClick={() => handleYearChange(currentYear - selectedYear, true)}
                title="Kembali ke tahun ini"
              >Sekarang</button>
            )}
          </div>
        </div>

        <div ref={jenisRef}>
          <SmartSearch
            label={`Jenis Pembayaran (${selectedYear})`}
            options={jenisBayar}
            value={null}
            onChange={handleAddJenis}
            multiSelect
            onConfirm={() => {
              setTimeout(() => {
                const firstNominal = document.querySelector('.payment-form__nominal-entry input');
                if (firstNominal) firstNominal.focus();
                else kasirRef.current?.querySelector('input')?.focus();
              }, 10);
            }}
          />
        </div>

        {selectedJenis.length > 0 && (
          <div className="payment-form__jenis-list">
            {selectedJenis.map(j => (
              <span key={j.id} className="payment-form__jenis-chip">
                {j.id} — {j.label}
                <button className="payment-form__jenis-chip-remove" onClick={() => handleRemoveJenis(j.id)}><X size={14} /></button>
              </span>
            ))}
          </div>
        )}

        {selectedJenis.map((j) => {
          const jid = (j.id || '').toLowerCase();
          const paid = paidAmounts[jid] || 0;
          const target = targetNominals[jid] || 0;
          const isLunas = target > 0 && paid >= target;
          const isCleared = target === -1;
          const disabled = isLunas || isCleared;
          return (
            <div key={j.id} className="payment-form__nominal-entry">
              <span className="payment-form__nominal-entry-label">
                {j.label}
                {isCleared && <span className="text-tertiary" style={{ marginLeft: '8px', fontSize: '0.8rem' }}>(Dihapus)</span>}
                {!isCleared && isLunas && <span className="text-success" style={{ marginLeft: '8px', fontSize: '0.8rem' }}>(Sudah Lunas)</span>}
                {!isCleared && !isLunas && paid > 0 && <span className="text-warning" style={{ marginLeft: '8px', fontSize: '0.8rem' }}>(Terbayar: {paid.toLocaleString('id-ID')})</span>}
              </span>
              <NominalInput
                value={nominals[j.id] || 0}
                onChange={(val) => handleNominalChange(j.id, val)}
                disabled={disabled}
                onConfirm={() => {
                  const entries = document.querySelectorAll('.payment-form__nominal-entry input:not(:disabled)');
                  const currentInput = document.activeElement;
                  const allInputs = Array.from(entries);
                  const nextIdx = allInputs.indexOf(currentInput) + 1;
                  if (allInputs[nextIdx]) allInputs[nextIdx].focus();
                  else kasirRef.current?.querySelector('input')?.focus();
                }}
              />
            </div>
          );
        })}

        <div ref={kasirRef}>
          <SmartSearch
            label="Kasir"
            options={kasirList}
            value={selectedKasir}
            onChange={setSelectedKasir}
            onConfirm={() => {
              setSumberDana(2);
              setTimeout(() => document.querySelector('.payment-form__sumber-btn[data-id="2"]')?.focus(), 10);
            }}
          />
        </div>

        <div className="payment-form__sumber-section">
          <span className="payment-form__sumber-label">Sumber Dana</span>
          <div className="payment-form__sumber-options">
            {sumberDanaList.map((s, idx) => (
              <button
                key={s.id}
                data-id={s.id}
                className={`payment-form__sumber-btn ${sumberDana === s.id ? 'payment-form__sumber-btn--active' : ''}`}
                onClick={() => setSumberDana(s.id)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight' && idx < sumberDanaList.length - 1) {
                    setSumberDana(sumberDanaList[idx + 1].id);
                    setTimeout(() => document.querySelectorAll('.payment-form__sumber-btn')[idx + 1]?.focus(), 0);
                  } else if (e.key === 'ArrowLeft' && idx > 0) {
                    setSumberDana(sumberDanaList[idx - 1].id);
                    setTimeout(() => document.querySelectorAll('.payment-form__sumber-btn')[idx - 1]?.focus(), 0);
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    setSumberDana(s.id);
                    setMetodeBayar('transfer');
                    setTimeout(() => document.querySelector('.payment-form__metode-btn[data-id="transfer"]')?.focus(), 10);
                  }
                }}
              >{s.label}</button>
            ))}
          </div>

          {getSumberKode(sumberDana) === 'lainnya' && (
            <div className="payment-form__custom-input animate-fade-in">
              <input
                type="text"
                placeholder="Sebutkan sumber dana lainnya... (opsional)"
                value={sumberDanaCustom}
                onChange={(e) => setSumberDanaCustom(e.target.value)}
                className="payment-form__input-text"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    setMetodeBayar('transfer');
                    setTimeout(() => document.querySelector('.payment-form__metode-btn[data-id="transfer"]')?.focus(), 10);
                  }
                }}
              />
            </div>
          )}
        </div>

        <div className="payment-form__metode-section">
          <span className="payment-form__metode-label">Metode Pembayaran</span>
          <div className="payment-form__metode-toggle">
            <button
              data-id="tunai"
              className={`payment-form__metode-btn ${metodeBayar === 'tunai' ? 'payment-form__metode-btn--active' : ''}`}
              onClick={() => setMetodeBayar('tunai')}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                  setMetodeBayar('transfer');
                  setTimeout(() => document.querySelector('.payment-form__metode-btn[data-id="transfer"]')?.focus(), 0);
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  setMetodeBayar('tunai');
                  handleSubmit(sumberDana, 'tunai');
                }
              }}
            ><Banknote size={16} /> Tunai</button>
            <button
              data-id="transfer"
              className={`payment-form__metode-btn ${metodeBayar === 'transfer' ? 'payment-form__metode-btn--active' : ''}`}
              onClick={() => setMetodeBayar('transfer')}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                  setMetodeBayar('tunai');
                  setTimeout(() => document.querySelector('.payment-form__metode-btn[data-id="tunai"]')?.focus(), 0);
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  setMetodeBayar('transfer');
                  handleSubmit(sumberDana, 'transfer');
                }
              }}
            ><CreditCard size={16} /> Transfer</button>
          </div>
        </div>
      </div>

      <div className="payment-form__footer">
        {onClose && <Button variant="ghost" icon={X} onClick={onClose}>Batal</Button>}
        <Button
          ref={submitRef}
          variant={!!selectedSantri && selectedJenis.length > 0 && !!selectedKasir && !!sumberDana && !!metodeBayar ? "primary" : "outline"}
          className="btn-transaction-submit flex-1"
          icon={Save}
          onClick={handleSubmit}
          disabled={submitting || !selectedSantri || selectedJenis.length === 0 || !selectedKasir || !sumberDana || !metodeBayar}
        >
          {submitting ? 'Menyimpan...' : 'Simpan Pembayaran'}
        </Button>
      </div>
    </div>
  );
}
