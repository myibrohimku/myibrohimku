import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

// ── Konstanta ──────────────────────────────────────────────────────────────
export const MONTHS = [
  { id: 1,  label: 'Jan', name: 'Januari'   }, { id: 2,  label: 'Feb', name: 'Februari'  },
  { id: 3,  label: 'Mar', name: 'Maret'     }, { id: 4,  label: 'Apr', name: 'April'     },
  { id: 5,  label: 'Mei', name: 'Mei'       }, { id: 6,  label: 'Jun', name: 'Juni'      },
  { id: 7,  label: 'Jul', name: 'Juli'      }, { id: 8,  label: 'Agu', name: 'Agustus'   },
  { id: 9,  label: 'Sep', name: 'September' }, { id: 10, label: 'Okt', name: 'Oktober'   },
  { id: 11, label: 'Nov', name: 'November'  }, { id: 12, label: 'Des', name: 'Desember'  }
];

// Kata-kata yang diabaikan dalam pencarian (stop words)
const SEARCH_STOP_WORDS = new Set(['kamar', 'bulan', 'semua', 'all', 'santri']);
// Kata-kata yang menandakan status lunas
const STATUS_LUNAS_WORDS = new Set(['lunas']);
// Kata-kata yang menandakan status tunggakan
const STATUS_UNPAID_WORDS = new Set(['nunggak', 'tunggakan', 'belum', 'hutang']);

// ── Helper: Deteksi apakah token adalah nama/kode bulan ────────────────────
function matchMonthToken(token) {
  return MONTHS.find(m =>
    m.name.toLowerCase() === token ||
    m.label.toLowerCase() === token ||
    (token.length >= 3 && m.name.toLowerCase().startsWith(token))
  ) || null;
}

// ── Helper: Format nomor telepon ke format internasional ─────────────────
function formatPhoneNumber(phone = '') {
  const clean = phone.replace(/[^0-9]/g, '');
  return clean.startsWith('0') ? '62' + clean.slice(1) : clean;
}

// ─────────────────────────────────────────────────────────────────────────
export function useUnpaidBilling() {
  // ── State ──────────────────────────────────────────────────────────────
  const [loading, setLoading]               = useState(true);
  const [year, setYear]                     = useState(new Date().getFullYear());
  const [categoryPrefix, setCategoryPrefix] = useState('SPP');
  const [searchQuery, setSearchQuery]       = useState('');
  const [santriRaw, setSantriRaw]           = useState([]);
  const [nominalRaw, setNominalRaw]         = useState([]);
  const [paymentsRaw, setPaymentsRaw]       = useState([]);
  const [categories, setCategories]         = useState([]);
  const [availableYears, setAvailableYears] = useState([]);

  // ── Fetch Data ─────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resSantri, resNominal, resPayments, resCategories, resYears] = await Promise.all([
        supabase
          .from('databasesantri')
          .select('id, nia, nama, kamar, ref_kamar(nama_kamar), no_wa_wali, is_deleted, status_id')
          .eq('is_deleted', false)
          .order('nama'),
        supabase
          .from('nominal_santri')
          .select('*')
          .eq('tahun', year)
          .ilike('jenis_bayar', `${categoryPrefix}%`),
        supabase
          .from('transaksi_pemasukan')
          .select('*')
          .eq('tahun_bayar', year)
          .ilike('jenis_bayar', `${categoryPrefix}%`),
        supabase
          .from('ref_transak_bln')
          .select('*')
          .order('id_transak_bln'),
        // BUG FIX: Ambil semua tahun unik dari nominal_santri TANPA filter kategori
        // agar semua tahun tersedia di dropdown meskipun kategori berganti
        supabase
          .from('nominal_santri')
          .select('tahun'),
      ]);

      if (resSantri.data)   setSantriRaw(resSantri.data);
      if (resNominal.data)  setNominalRaw(resNominal.data);
      if (resPayments.data) setPaymentsRaw(resPayments.data);

      // Susun daftar tahun yang tersedia
      if (resYears.data) {
        const years = [...new Set(resYears.data.map(d => d.tahun))].sort((a, b) => b - a);
        setAvailableYears(years.map(y => ({ value: y, label: y.toString() })));
      }

      // Susun daftar kategori dari ref_transak_bln (tanpa nama bulan di akhir label)
      if (resCategories.data) {
        const prefixMap = {};
        resCategories.data.forEach(cat => {
          // BUG FIX: Ambil 3 karakter terakhir sebagai bulan (01-12)
          // dan sisanya adalah prefix kategori
          const prefix = cat.id_transak_bln.slice(0, -2);
          if (!prefixMap[prefix]) {
            const parts = cat.label_transak_bln.split(' ');
            const label = parts.length > 1 ? parts.slice(0, -1).join(' ') : parts[0];
            prefixMap[prefix] = { value: prefix, label };
          }
        });
        const cats = Object.values(prefixMap);
        setCategories(cats);

        // BUG FIX: Hanya auto-pilih kategori pertama pada mount awal,
        // bukan setiap kali re-fetch. Cek apakah categoryPrefix saat ini valid.
        if (cats.length > 0 && !cats.find(c => c.value === categoryPrefix)) {
          setCategoryPrefix(cats[0].value);
        }
      }
    } catch (err) {
      console.error('[useUnpaidBilling] Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  // BUG FIX: Hilangkan categoryPrefix dari dependency fetchData agar tidak
  // terjadi infinite re-fetch loop saat setCategoryPrefix dipanggil di dalam fetchData.
  // categoryPrefix dan year sudah di-track melalui useEffect terpisah.
  }, [year, categoryPrefix]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Kalkulasi Status Tagihan per Santri ────────────────────────────────
  const processedData = useMemo(() => {
    return santriRaw
      .map(s => {
        const santriNominals = nominalRaw.filter(n => n.santri_id === s.id);
        const santriPayments = paymentsRaw.filter(p => p.santri_id === s.id);

        let totalTunggakan = 0;
        let totalTarget    = 0;

        const months = MONTHS.map(m => {
          const monthId    = m.id.toString().padStart(2, '0');
          const jenisBayar = `${categoryPrefix}${monthId}`.toLowerCase();

          /** target: Nominal yang harus dibayar (0 = gratis/belum diset) */
          const target = Number(santriNominals.find(n => n.jenis_bayar?.toLowerCase() === jenisBayar)?.nominal ?? 0);

          /** paid: Total yang sudah terbayar di bulan ini */
          const paid = santriPayments
            .filter(p => p.jenis_bayar?.toLowerCase() === jenisBayar)
            .reduce((sum, p) => sum + Number(p.nominal ?? 0), 0);

          /** isCleared: Pemutihan / Dihapus (target = -1) */
          const isCleared = target === -1;

          /** isPaid: Lunas jika target=0 (gratis) ATAU bayar >= target, tidak termasuk yang dihapus */
          const isPaid   = !isCleared && (target === 0 || paid >= target);

          /** isUnpaid: Nunggak jika ada kewajiban DAN belum lunas */
          const isUnpaid = target > 0 && paid < target;

          /** diff: Sisa yang harus dibayar (tidak bisa negatif) */
          const diff = Math.max(0, target - paid);

          if (isUnpaid) totalTunggakan += diff;
          if (target > 0) totalTarget += target;

          return { id: m.id, name: m.name, label: m.label, target, paid, isCleared, isPaid, isUnpaid, diff };
        });

        return {
          ...s,
          kamar: s.ref_kamar?.nama_kamar || s.kamar || '-',
          isNonAktif: s.status_id !== 1,
          months,
          totalTunggakan,
          totalTarget,
          hasTarget: totalTarget > 0,
        };
      })
        // BUG FIX: Hanya tampilkan santri yang sudah disetup nominal untuk
        // setidaknya satu bulan di tahun & kategori ini.
        // Juga amankan dari kasus santri.months undefined/null.
      .filter(s => s.hasTarget && Array.isArray(s.months));
  }, [santriRaw, nominalRaw, paymentsRaw, categoryPrefix]);

  // Kumpulan nama kamar yang valid (untuk deteksi token kamar di search)
  const allKamarSet = useMemo(() => {
    return new Set(processedData.map(s => s.kamar?.toLowerCase()).filter(Boolean));
  }, [processedData]);

  // ── Smart Search & Sort ─────────────────────────────────────────────────
  const filteredData = useMemo(() => {
    const catLabel = categories.find(c => c.value === categoryPrefix)?.label?.toLowerCase() || '';

    // Tanpa query: langsung sort by kamar → nama
    const sortByKamarNama = (arr) =>
      [...arr].sort((a, b) => {
        const kamarCmp = (a.kamar || '').localeCompare(b.kamar || '');
        return kamarCmp !== 0 ? kamarCmp : a.nama.localeCompare(b.nama);
      });

    if (!searchQuery.trim()) return sortByKamarNama(processedData);

    const tokens = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);

    // ── Pass 1: Klasifikasikan setiap token ──────────────────────────────
    let statusFilter = null;  // 'lunas' | 'unpaid' | null
    const monthFilters  = []; // Array of month IDs (AND logic)
    const kamarFilters  = []; // Array of kamar strings (OR logic)
    const generalTokens = []; // Sisa token (AND logic di searchSpace)

    for (const token of tokens) {
      if (SEARCH_STOP_WORDS.has(token))       continue; // Abaikan
      if (STATUS_LUNAS_WORDS.has(token))      { statusFilter = 'lunas';  continue; }
      if (STATUS_UNPAID_WORDS.has(token))     { statusFilter = 'unpaid'; continue; }

      const matchedMonth = matchMonthToken(token);
      if (matchedMonth) { monthFilters.push(matchedMonth.id); continue; }

      // Exact match ke daftar kamar yang ada di data
      if (allKamarSet.has(token)) { kamarFilters.push(token); continue; }

      generalTokens.push(token);
    }

    // ── Pass 2: Filter per santri ─────────────────────────────────────────
    const filtered = processedData.filter(s => {
      const sKamar      = s.kamar?.toLowerCase() || '';
      const searchSpace = `${s.nama} ${s.nia || ''} ${sKamar} ${catLabel}`.toLowerCase();

      // Evaluasi Kamar (OR: cocok salah satu saja sudah cukup)
      if (kamarFilters.length > 0 && !kamarFilters.some(k => sKamar === k)) return false;

      // Evaluasi Status + Bulan
      if (statusFilter && monthFilters.length > 0) {
        // Status spesifik di bulan tertentu (AND: semua bulan harus cocok)
        for (const monthId of monthFilters) {
          const mData = s.months.find(m => m.id === monthId);
          if (statusFilter === 'lunas'  && !mData?.isPaid)   return false;
          if (statusFilter === 'unpaid' && !mData?.isUnpaid) return false;
        }
      } else if (statusFilter) {
        // Status keseluruhan (tidak menyebut bulan tertentu)
        if (statusFilter === 'lunas'  && s.totalTunggakan > 0)  return false;
        if (statusFilter === 'unpaid' && s.totalTunggakan === 0) return false;
      } else if (monthFilters.length > 0) {
        // Hanya sebut bulan → asumsikan cari yang NUNGGAK di bulan itu
        for (const monthId of monthFilters) {
          const mData = s.months.find(m => m.id === monthId);
          if (!mData?.isUnpaid) return false;
        }
      }

      // Evaluasi token umum (AND: semua harus ada di searchSpace)
      for (const token of generalTokens) {
        if (!searchSpace.includes(token)) return false;
      }

      return true;
    });

    return sortByKamarNama(filtered);
  }, [processedData, searchQuery, categories, categoryPrefix, allKamarSet]);

  // ── Return API ─────────────────────────────────────────────────────────
  return {
    loading,
    year,        setYear,
    categoryPrefix, setCategoryPrefix,
    searchQuery, setSearchQuery,
    categories,
    availableYears,
    data: filteredData,
    refetch: fetchData,
    // Helper diekspor agar komponen lain tidak perlu re-implement
    formatPhoneNumber,
  };
}
