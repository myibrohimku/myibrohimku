import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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

// Batas maksimal baris per request PostgREST; dipakai untuk paginasi manual
const PAGE_SIZE = 1000;

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

// Prefix kategori = deretan huruf di awal jenis_bayar (mis. "ld01" → "ld")
function categoryPrefixOf(jenisBayar) {
  const match = (jenisBayar || '').toLowerCase().trim().match(/^[a-z]+/);
  return match ? match[0] : '';
}

// Label kategori dari label master ("SPP Januari" → "SPP")
function deriveCategoryLabel(label) {
  const parts = (label || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  return parts.length > 1 ? parts.slice(0, -1).join(' ') : parts[0];
}

// Ambil SEMUA baris (menembus batas 1000 baris PostgREST).
// Halaman pertama sekaligus mengambil total count, sisanya diambil paralel
// agar tidak menunggu request berurutan.
async function fetchAllRows(table, select, { filters, orderBy } = {}) {
  const build = (from, withCount) => {
    let query = supabase
      .from(table)
      .select(select, withCount ? { count: 'exact' } : undefined)
      .range(from, from + PAGE_SIZE - 1);
    if (orderBy) query = query.order(orderBy);
    if (filters) query = filters(query);
    return query;
  };

  const first = await build(0, true);
  if (first.error) throw first.error;

  const rows = [...(first.data || [])];
  const total = first.count ?? rows.length;
  if (rows.length < PAGE_SIZE || total <= PAGE_SIZE) return rows;

  const pageCount = Math.ceil(total / PAGE_SIZE);
  const rest = await Promise.all(
    Array.from({ length: pageCount - 1 }, (_, i) => build((i + 1) * PAGE_SIZE, false))
  );
  for (const res of rest) {
    if (res.error) throw res.error;
    rows.push(...(res.data || []));
  }
  return rows;
}

// Daftar tahun cukup dari batas min/max — jauh lebih cepat daripada
// memaginasi seluruh isi nominal_santri.
async function fetchAvailableYears() {
  const [minRes, maxRes] = await Promise.all([
    supabase.from('nominal_santri').select('tahun').order('tahun', { ascending: true }).limit(1),
    supabase.from('nominal_santri').select('tahun').order('tahun', { ascending: false }).limit(1),
  ]);
  if (minRes.error) throw minRes.error;
  if (maxRes.error) throw maxRes.error;

  const min = Number(minRes.data?.[0]?.tahun);
  const max = Number(maxRes.data?.[0]?.tahun);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];

  const years = [];
  for (let y = max; y >= min; y--) years.push(y);
  return years;
}

// ─────────────────────────────────────────────────────────────────────────
export function useUnpaidBilling() {
  // ── State ──────────────────────────────────────────────────────────────
  const [loading, setLoading]               = useState(true);
  const [year, setYear]                     = useState(new Date().getFullYear());
  const [categoryPrefix, setCategoryPrefix] = useState('SPP');
  const [statusFilter, setStatusFilter]     = useState('unpaid'); // unpaid (default) | paid | all
  const [searchQuery, setSearchQuery]       = useState('');
  const [santriRaw, setSantriRaw]           = useState([]);
  const [nominalRaw, setNominalRaw]         = useState([]);
  const [paymentsRaw, setPaymentsRaw]       = useState([]);
  const [refCategories, setRefCategories]   = useState([]);
  const [availableYears, setAvailableYears] = useState([]);
  const requestRef = useRef(0);
  const staticLoadedRef = useRef(false);

  // ── Fetch Data ─────────────────────────────────────────────────────────
  // Santri, kategori, dan daftar tahun hanya diambil sekali per kunjungan;
  // pergantian tahun cukup mengambil nominal + pembayaran tahun tersebut.
  const fetchData = useCallback(async (forceStatic = false) => {
    const requestId = ++requestRef.current;
    const needStatic = forceStatic || !staticLoadedRef.current;
    setLoading(true);
    try {
      const [santri, refRows, yearRows, nominal, payments] = await Promise.all([
        needStatic
          ? fetchAllRows(
              'databasesantri',
              'id, nia, nama, kamar, no_wa_wali, is_deleted, status_id, ref_kamar(nama_kamar), ref_status_santri(nama_status)',
              { orderBy: 'id', filters: q => q.eq('is_deleted', false) }
            )
          : null,
        needStatic
          ? fetchAllRows('ref_transak_bln', 'id_transak_bln, label_transak_bln', {
              orderBy: 'id_transak_bln',
            })
          : null,
        needStatic
          ? fetchAvailableYears()
          : null,
        fetchAllRows('nominal_santri', 'santri_id, jenis_bayar, nominal', {
          orderBy: 'id',
          filters: q => q.eq('tahun', year),
        }),
        fetchAllRows('transaksi_pemasukan', 'santri_id, jenis_bayar, nominal', {
          orderBy: 'id',
          filters: q => q.eq('tahun_bayar', year),
        }),
      ]);

      // Abaikan respons basi jika user sudah mengganti tahun
      if (requestId !== requestRef.current) return;

      if (needStatic) {
        setSantriRaw([...santri].sort((a, b) => (a.nama || '').localeCompare(b.nama || '')));
        setRefCategories(
          refRows
            .map(r => ({
              prefix: categoryPrefixOf(r.id_transak_bln),
              label: deriveCategoryLabel(r.label_transak_bln),
            }))
            .filter(c => c.prefix)
        );

        setAvailableYears(yearRows.map(y => ({ value: y, label: y.toString() })));
        staticLoadedRef.current = true;
      }

      setNominalRaw(nominal);
      setPaymentsRaw(payments);
    } catch (err) {
      console.error('[useUnpaidBilling] Error fetching data:', err);
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Kategori hanya dari master aktif (ref_transak_bln). Prefix yang tersisa di
  // nominal/pembayaran tapi sudah dihapus dari master (mis. GL/WF) tidak ditampilkan.
  const categories = useMemo(() => {
    const map = new Map();
    refCategories.forEach(({ prefix, label }) => {
      if (!map.has(prefix)) map.set(prefix, { value: prefix, label: label || prefix.toUpperCase() });
    });
    return [...map.values()];
  }, [refCategories]);

  // Kategori efektif: pakai pilihan user bila valid, selain itu pilih otomatis
  // kategori yang benar-benar punya nominal untuk tahun aktif.
  const activeCategory = useMemo(() => {
    const current = categoryPrefix.toLowerCase();
    if (categories.length === 0) return current;

    const hasTarget = (prefix) =>
      nominalRaw.some(n => categoryPrefixOf(n.jenis_bayar) === prefix && Number(n.nominal) > 0);
    const hasPayment = (prefix) =>
      paymentsRaw.some(p => categoryPrefixOf(p.jenis_bayar) === prefix);

    // Pilihan eksplisit user dipertahankan (kecuali masih nilai default 'spp')
    if (current !== 'spp' && categories.some(c => c.value === current)) return current;

    const preferred =
      categories.find(c => c.value === 'spp' && hasTarget(c.value)) ||
      categories.find(c => hasTarget(c.value) && hasPayment(c.value)) ||
      categories.find(c => hasTarget(c.value)) ||
      categories[0];

    return preferred ? preferred.value : current;
  }, [categoryPrefix, categories, nominalRaw, paymentsRaw]);

  // ── Indeks tagihan & pembayaran per (santri, jenis) ────────────────────
  // Dibangun sekali per kategori/tahun agar tidak memfilter ribuan baris
  // untuk setiap santri.
  const { nominalIndex, paymentIndex } = useMemo(() => {
    const prefix = activeCategory;
    const nomIndex = new Map();
    for (const n of nominalRaw) {
      if (categoryPrefixOf(n.jenis_bayar) !== prefix) continue;
      const key = `${n.santri_id}|${(n.jenis_bayar || '').toLowerCase()}`;
      if (!nomIndex.has(key)) nomIndex.set(key, Number(n.nominal ?? 0));
    }

    const payIndex = new Map();
    for (const p of paymentsRaw) {
      if (categoryPrefixOf(p.jenis_bayar) !== prefix) continue;
      const key = `${p.santri_id}|${(p.jenis_bayar || '').toLowerCase()}`;
      payIndex.set(key, (payIndex.get(key) || 0) + Number(p.nominal ?? 0));
    }

    return { nominalIndex: nomIndex, paymentIndex: payIndex };
  }, [nominalRaw, paymentsRaw, activeCategory]);

  // ── Kalkulasi Status Tagihan per Santri ────────────────────────────────
  const processedData = useMemo(() => {
    const prefix = activeCategory;
    return santriRaw
      .map(s => {
        let totalTunggakan = 0;
        let totalTarget    = 0;

        const months = MONTHS.map(m => {
          const monthId    = m.id.toString().padStart(2, '0');
          const jenisBayar = `${prefix}${monthId}`;
          const key        = `${s.id}|${jenisBayar}`;

          /** target: Nominal yang harus dibayar (0 = belum diset, -1 = pemutihan) */
          const target = nominalIndex.get(key) ?? 0;

          /** paid: Total yang sudah terbayar di bulan ini */
          const paid = paymentIndex.get(key) || 0;

          /** isCleared: Pemutihan / Dihapus (target = -1) */
          const isCleared = target === -1;

          /** isEmpty: Belum ada nominal tagihan untuk bulan ini */
          const isEmpty = !isCleared && target === 0;

          /** isPaid: HANYA lunas jika benar-benar ada tagihan dan sudah dibayar penuh */
          const isPaid = !isCleared && target > 0 && paid >= target;

          /** isUnpaid: Nunggak jika ada kewajiban DAN belum lunas */
          const isUnpaid = target > 0 && paid < target;

          /** diff: Sisa yang harus dibayar (tidak bisa negatif) */
          const diff = Math.max(0, target - paid);

          if (isUnpaid) totalTunggakan += diff;
          if (target > 0) totalTarget += target;

          return { id: m.id, name: m.name, label: m.label, target, paid, isCleared, isEmpty, isPaid, isUnpaid, diff };
        });

        return {
          ...s,
          kamar: s.ref_kamar?.nama_kamar || s.kamar || '-',
          // Status "aktif" ditentukan dari label master, bukan asumsi id=1
          isNonAktif: (s.ref_status_santri?.nama_status || '').toLowerCase().trim() !== ''
            ? (s.ref_status_santri?.nama_status || '').toLowerCase().trim() !== 'aktif'
            : s.status_id !== 1,
          months,
          totalTunggakan,
          totalTarget,
          hasTarget: totalTarget > 0,
        };
      })
      // Hanya tampilkan santri yang punya nominal tagihan di tahun & kategori ini
      .filter(s => s.hasTarget);
  }, [santriRaw, nominalIndex, paymentIndex, activeCategory]);

  // Kumpulan nama kamar yang valid (untuk deteksi token kamar di search)
  const allKamarSet = useMemo(() => {
    return new Set(processedData.map(s => s.kamar?.toLowerCase()).filter(Boolean));
  }, [processedData]);

  // Status dari kata kunci pencarian (menimpa pilihan dropdown)
  const queryStatus = useMemo(() => {
    for (const token of searchQuery.toLowerCase().split(/\s+/)) {
      if (STATUS_LUNAS_WORDS.has(token)) return 'paid';
      if (STATUS_UNPAID_WORDS.has(token)) return 'unpaid';
    }
    return null;
  }, [searchQuery]);

  const effectiveStatusFilter = queryStatus || statusFilter;

  // ── Smart Search & Sort ─────────────────────────────────────────────────
  const filteredData = useMemo(() => {
    const catLabel = categories.find(c => c.value === activeCategory)?.label?.toLowerCase() || '';

    // Tanpa query: langsung sort by kamar → nama
    const sortByKamarNama = (arr) =>
      [...arr].sort((a, b) => {
        const kamarCmp = (a.kamar || '').localeCompare(b.kamar || '');
        return kamarCmp !== 0 ? kamarCmp : a.nama.localeCompare(b.nama);
      });

    if (!searchQuery.trim() && effectiveStatusFilter === 'all') return sortByKamarNama(processedData);

    const tokens = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);

    // ── Pass 1: Klasifikasikan setiap token ──────────────────────────────
    const monthFilters  = []; // Array of month IDs (AND logic)
    const kamarFilters  = []; // Array of kamar strings (OR logic)
    const generalTokens = []; // Sisa token (AND logic di searchSpace)

    for (const token of tokens) {
      if (SEARCH_STOP_WORDS.has(token))       continue; // Abaikan
      // Kata status sudah ditangani lewat queryStatus
      if (STATUS_LUNAS_WORDS.has(token) || STATUS_UNPAID_WORDS.has(token)) continue;

      const matchedMonth = matchMonthToken(token);
      if (matchedMonth) { monthFilters.push(matchedMonth.id); continue; }

      // Exact match ke daftar kamar yang ada di data
      if (allKamarSet.has(token)) { kamarFilters.push(token); continue; }

      generalTokens.push(token);
    }

    let base = processedData;
    if (effectiveStatusFilter === 'paid')   base = base.filter(s => s.totalTunggakan === 0);
    if (effectiveStatusFilter === 'unpaid') base = base.filter(s => s.totalTunggakan > 0);

    if (tokens.length === 0) return sortByKamarNama(base);

    // ── Pass 2: Filter per santri ─────────────────────────────────────────
    const filtered = base.filter(s => {
      const sKamar      = s.kamar?.toLowerCase() || '';
      const searchSpace = `${s.nama} ${s.nia || ''} ${sKamar} ${catLabel}`.toLowerCase();

      // Evaluasi Kamar (OR: cocok salah satu saja sudah cukup)
      if (kamarFilters.length > 0 && !kamarFilters.some(k => sKamar === k)) return false;

      // Evaluasi Bulan sesuai status efektif
      for (const monthId of monthFilters) {
        const mData = s.months.find(m => m.id === monthId);
        if (effectiveStatusFilter === 'paid'   && !mData?.isPaid)   return false;
        if (effectiveStatusFilter === 'unpaid' && !mData?.isUnpaid) return false;
        // Tanpa filter status (Semua), pencarian bulan berarti cari yang menunggak
        if (effectiveStatusFilter === 'all'    && !mData?.isUnpaid) return false;
      }

      // Evaluasi token umum (AND: semua harus ada di searchSpace)
      for (const token of generalTokens) {
        if (!searchSpace.includes(token)) return false;
      }

      return true;
    });

    return sortByKamarNama(filtered);
  }, [processedData, searchQuery, categories, activeCategory, allKamarSet, effectiveStatusFilter]);

  // ── Return API ─────────────────────────────────────────────────────────
  return {
    loading,
    year,        setYear,
    categoryPrefix: activeCategory, setCategoryPrefix,
    statusFilter: effectiveStatusFilter, setStatusFilter,
    searchQuery, setSearchQuery,
    categories,
    availableYears,
    data: filteredData,
    refetch: () => fetchData(true),
    // Helper diekspor agar komponen lain tidak perlu re-implement
    formatPhoneNumber,
  };
}
