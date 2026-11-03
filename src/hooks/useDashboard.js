import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const PAGE_SIZE = 1000;

/** Ambil semua baris (melewati batas 1000 PostgREST) dengan pagination paralel. */
async function fetchAllRows(table, select, { filters } = {}) {
  const build = (from, withCount) => {
    let query = supabase
      .from(table)
      .select(select, withCount ? { count: 'exact' } : undefined)
      .range(from, from + PAGE_SIZE - 1);
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

/** 'ld07' → 'ld' */
const prefixOf = (jenis) => {
  const m = String(jenis || '').toLowerCase().match(/^[a-z]+/);
  return m ? m[0] : null;
};

/** 'Kas Asrama Januari' → 'Kas Asrama' */
const deriveCategoryLabel = (label) => {
  if (!label) return '';
  const parts = String(label).trim().split(/\s+/);
  if (parts.length > 1) parts.pop();
  return parts.join(' ');
};

export function useDashboard() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [refRows, setRefRows] = useState([]);
  const [santriRaw, setSantriRaw] = useState([]);
  const [incomeRaw, setIncomeRaw] = useState([]);
  const [outcomeRaw, setOutcomeRaw] = useState([]);
  const [nominalRaw, setNominalRaw] = useState([]);
  const [paymentsRaw, setPaymentsRaw] = useState([]);
  const [recentIncome, setRecentIncome] = useState([]);
  const [recentOutcome, setRecentOutcome] = useState([]);
  const [yearList, setYearList] = useState([currentYear]);
  const [loading, setLoading] = useState(true);

  const staticLoadedRef = useRef(false);
  const requestRef = useRef(0);

  const fetchAll = useCallback(async () => {
    const requestId = ++requestRef.current;
    const needStatic = !staticLoadedRef.current;
    setLoading(true);
    try {
      // Batas tahun dipakai juga oleh DompetForm untuk saldo chip sumber dana,
      // sehingga Saldo Bersih di kartu sama persis dengan saldo di halaman Transaksi.
      const yearStart = `${year}-01-01T00:00:00.000Z`;
      const nextYearStart = `${year + 1}-01-01T00:00:00.000Z`;

      const staticPromise = needStatic
        ? Promise.all([
            supabase
              .from('databasesantri')
              .select('id, ref_status_santri(nama_status)')
              .eq('is_deleted', false),

            // Batas min/max tahun — lebih murah daripada mengambil seluruh kolom tahun.
            (async () => {
              try {
                const [minRes, maxRes] = await Promise.all([
                  supabase.from('nominal_santri').select('tahun').order('tahun', { ascending: true }).limit(1),
                  supabase.from('nominal_santri').select('tahun').order('tahun', { ascending: false }).limit(1),
                ]);
                if (minRes.error || maxRes.error) return { min: null, max: null };
                return {
                  min: minRes.data?.[0]?.tahun ?? null,
                  max: maxRes.data?.[0]?.tahun ?? null,
                };
              } catch {
                return { min: null, max: null };
              }
            })(),

            // Master kategori tagihan aktif — prefix yang sudah dihapus dari
            // master (mis. GL/WF) tidak pernah tampil di filter maupun hitungan.
            supabase.from('ref_transak_bln').select('id_transak_bln, label_transak_bln'),
          ])
        : Promise.resolve(null);

      const yearPromise = Promise.all([
        // Pemasukan per TAHUN TAGIHAN (tahun_bayar) — dasar yang sama dengan
        // perhitungan saldo chip DompetForm, bukan tanggal catat (created_at).
        fetchAllRows('transaksi_pemasukan', 'nominal, created_at, jenis_bayar', {
          filters: (q) => q.eq('tahun_bayar', year),
        }),

        // Pengeluaran per tanggal catat; alokasi per kategori dihitung dari
        // sumber_dana persis seperti chip sumber dana di DompetForm.
        fetchAllRows('transaksi_pengeluaran', 'nominal, created_at, sumber_dana', {
          filters: (q) => q.gte('created_at', yearStart).lt('created_at', nextYearStart),
        }),

        fetchAllRows('nominal_santri', 'santri_id, jenis_bayar, nominal, tahun', {
          filters: (q) => q.eq('tahun', year),
        }),

        fetchAllRows('transaksi_pemasukan', 'santri_id, jenis_bayar, nominal', {
          filters: (q) => q.eq('tahun_bayar', year),
        }),

        // Transaksi terbaru (global, lintas tahun) — difilter kategori di client.
        supabase
          .from('transaksi_pemasukan')
          .select('id, nominal, jenis_bayar, created_at, databasesantri(nama, nia)')
          .order('created_at', { ascending: false })
          .limit(25),

        supabase
          .from('transaksi_pengeluaran')
          .select('id, nominal, deskripsi, created_at, urgensi_id, sumber_dana')
          .order('created_at', { ascending: false })
          .limit(25),
      ]);

      const [yearResults, staticResults] = await Promise.all([yearPromise, staticPromise]);
      if (requestId !== requestRef.current) return; // abaikan respons usang

      const [incomeRows, outcomeRows, nominalRows, paymentRows, resRecentIncome, resRecentOutcome] =
        yearResults;
      setIncomeRaw(incomeRows);
      setOutcomeRaw(outcomeRows);
      setNominalRaw(nominalRows);
      setPaymentsRaw(paymentRows);
      if (!resRecentIncome.error) setRecentIncome(resRecentIncome.data || []);
      if (!resRecentOutcome.error) setRecentOutcome(resRecentOutcome.data || []);

      if (staticResults) {
        const [resSantri, yearsInfo, resRef] = staticResults;
        if (!resSantri.error) setSantriRaw(resSantri.data || []);
        if (!resRef.error) setRefRows(resRef.data || []);
        const lo = Math.min(yearsInfo.min ?? currentYear, currentYear);
        const hi = Math.max(yearsInfo.max ?? currentYear, currentYear);
        const years = [];
        for (let y = hi; y >= lo; y--) years.push(y);
        setYearList(years);
        staticLoadedRef.current = true;
      }
    } catch (err) {
      console.error('[useDashboard] Error:', err);
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [year, currentYear]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Kategori (hanya dari master aktif, dengan opsi Semua) ────────────────
  const categories = useMemo(() => {
    const map = new Map();
    refRows.forEach((r) => {
      const prefix = prefixOf(r.id_transak_bln);
      if (!prefix || map.has(prefix)) return;
      map.set(prefix, deriveCategoryLabel(r.label_transak_bln) || prefix.toUpperCase());
    });
    return [
      { value: 'all', label: 'Semua Kategori' },
      ...[...map.entries()].map(([value, label]) => ({ value, label })),
    ];
  }, [refRows]);

  const refPrefixes = useMemo(
    () => new Set(categories.filter((c) => c.value !== 'all').map((c) => c.value)),
    [categories]
  );

  // Prefix harus kategori aktif (bukan sisa data kategori yang sudah dihapus).
  const matchesCategory = useCallback(
    (prefix) =>
      !!prefix && refPrefixes.has(prefix) && (categoryFilter === 'all' || prefix === categoryFilter),
    [refPrefixes, categoryFilter]
  );

  // ── Baris yang masuk filter kategori ─────────────────────────────────────
  const filteredIncome = useMemo(
    () => incomeRaw.filter((t) => matchesCategory(prefixOf(t.jenis_bayar))),
    [incomeRaw, matchesCategory]
  );

  // Pengeluaran masuk kategori bila salah satu alokasi sumber_dana-nya berasal
  // dari prefix kategori yang aktif.
  const filteredOutcome = useMemo(
    () =>
      outcomeRaw.filter((t) =>
        (Array.isArray(t.sumber_dana) ? t.sumber_dana : []).some((s) =>
          matchesCategory(prefixOf(s.jenis))
        )
      ),
    [outcomeRaw, matchesCategory]
  );

  // ── Kalkulasi per bulan (dari baris terfilter kategori) ─────────────────
  const chartByMonth = useMemo(() => {
    const incomeByMonth = Array(12).fill(0);
    const outcomeByMonth = Array(12).fill(0);

    filteredIncome.forEach((t) => {
      const d = new Date(t.created_at);
      if (!isNaN(d)) incomeByMonth[d.getMonth()] += Number(t.nominal || 0);
    });

    filteredOutcome.forEach((t) => {
      const d = new Date(t.created_at);
      if (!isNaN(d)) outcomeByMonth[d.getMonth()] += Number(t.nominal || 0);
    });

    return {
      labels: MONTH_LABELS,
      income: incomeByMonth,
      outcome: outcomeByMonth,
    };
  }, [filteredIncome, filteredOutcome]);

  // ── Data grafik bervariabel: bulanan (Semua) atau harian (bulan dipilih) ──
  const chartData = useMemo(() => {
    if (month === 'all') {
      return {
        labels: chartByMonth.labels,
        income: chartByMonth.income,
        outcome: chartByMonth.outcome,
        granularity: 'month',
      };
    }
    const m = parseInt(month, 10);
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    const labels = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));
    const inc = Array(daysInMonth).fill(0);
    const out = Array(daysInMonth).fill(0);
    filteredIncome.forEach((t) => {
      const d = new Date(t.created_at);
      if (!isNaN(d) && d.getMonth() === m) inc[d.getDate() - 1] += Number(t.nominal || 0);
    });
    filteredOutcome.forEach((t) => {
      const d = new Date(t.created_at);
      if (!isNaN(d) && d.getMonth() === m) out[d.getDate() - 1] += Number(t.nominal || 0);
    });
    return { labels, income: inc, outcome: out, granularity: 'day' };
  }, [month, year, chartByMonth, filteredIncome, filteredOutcome]);

  // ── Ringkasan stat (mengikuti filter kategori DAN filter bulan aktif) ────
  // Kartu dan grafik harus menyajikan periode yang sama: bulan dipilih →
  // kartu menghitung hanya transaksi pada bulan itu (berdasarkan tanggal
  // catat, persis seperti pengelompokan grafik); 'Semua Bulan' → setahun penuh.
  const stats = useMemo(() => {
    const m = month === 'all' ? null : parseInt(month, 10);
    const inMonth = (t) => m === null || new Date(t.created_at).getMonth() === m;
    const monthIncome = filteredIncome.filter(inMonth);
    const monthOutcome = filteredOutcome.filter(inMonth);

    const totalIncome = monthIncome.reduce((s, t) => s + Number(t.nominal || 0), 0);
    const totalOutcome = monthOutcome.reduce((s, t) => s + Number(t.nominal || 0), 0);
    const saldo = totalIncome - totalOutcome;

    // Total setahun (tanpa filter bulan) — dipakai untuk rasio tunggakan.
    const annualIncome = filteredIncome.reduce((s, t) => s + Number(t.nominal || 0), 0);

    const totalSantri = santriRaw.filter(
      (s) => (s.ref_status_santri?.nama_status || '').toLowerCase() === 'aktif'
    ).length;
    const activeSantriIds = new Set(santriRaw.map((s) => s.id));

    // Tren pemasukan: bulan tampilan vs bulan sebelumnya (berdasarkan tanggal
    // catat, konsisten dengan pengelompokan grafik).
    const baseMonth = m === null ? new Date().getMonth() : m;
    const prevMonth = baseMonth === 0 ? 11 : baseMonth - 1;
    const sumMonth = (mm) =>
      filteredIncome
        .filter((t) => new Date(t.created_at).getMonth() === mm)
        .reduce((s, t) => s + Number(t.nominal || 0), 0);
    const incomeThisMonth = sumMonth(baseMonth);
    const incomeLastMonth = sumMonth(prevMonth);
    const incomeTrend =
      incomeLastMonth > 0
        ? (((incomeThisMonth - incomeLastMonth) / incomeLastMonth) * 100).toFixed(1)
        : null;

    // Tunggakan: nominal target vs pembayaran, keduanya per kategori aktif.
    const paymentsMap = {};
    paymentsRaw.forEach((p) => {
      if (!matchesCategory(prefixOf(p.jenis_bayar))) return;
      const key = `${p.santri_id}|${(p.jenis_bayar || '').toLowerCase()}`;
      paymentsMap[key] = (paymentsMap[key] || 0) + Number(p.nominal || 0);
    });

    const unpaidSantriSet = new Set();
    let unpaidTotal = 0;
    nominalRaw.forEach((n) => {
      if (!activeSantriIds.has(n.santri_id)) return;
      if (!matchesCategory(prefixOf(n.jenis_bayar))) return;
      const key = `${n.santri_id}|${(n.jenis_bayar || '').toLowerCase()}`;
      const paid = paymentsMap[key] || 0;
      const target = Number(n.nominal || 0);
      if (target > 0 && paid < target) {
        unpaidSantriSet.add(n.santri_id);
        unpaidTotal += target - paid;
      }
    });

    return {
      totalIncome,
      totalOutcome,
      saldo,
      annualIncome,
      incomeTxCount: monthIncome.length,
      outcomeTxCount: monthOutcome.length,
      totalSantri,
      unpaidCount: unpaidSantriSet.size,
      unpaidTotal,
      incomeTrend,
    };
  }, [filteredIncome, filteredOutcome, santriRaw, paymentsRaw, nominalRaw, matchesCategory, month]);

  // ── Transaksi terbaru (terfilter kategori) ───────────────────────────────
  const recentTransactions = useMemo(() => {
    const combined = [
      ...recentIncome
        .filter((i) => matchesCategory(prefixOf(i.jenis_bayar)))
        .map((i) => ({
          id: `inc-${i.id}`,
          type: 'income',
          nama: i.databasesantri?.nama || '-',
          keterangan: i.jenis_bayar,
          nominal: Number(i.nominal || 0),
          created_at: i.created_at,
        })),
      ...recentOutcome
        .filter((o) =>
          (Array.isArray(o.sumber_dana) ? o.sumber_dana : []).some((s) =>
            matchesCategory(prefixOf(s.jenis))
          )
        )
        .map((o) => ({
          id: `out-${o.id}`,
          type: 'outcome',
          nama: o.deskripsi || '-',
          keterangan: o.urgensi_id,
          nominal: Number(o.nominal || 0),
          created_at: o.created_at,
        })),
    ];
    combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return combined.slice(0, 8);
  }, [recentIncome, recentOutcome, matchesCategory]);

  const availableYears = useMemo(
    () => yearList.map((y) => ({ value: y, label: String(y) })),
    [yearList]
  );

  return {
    loading,
    year,
    setYear,
    month,
    setMonth,
    availableYears,
    categories,
    categoryFilter,
    setCategoryFilter,
    stats,
    chartByMonth,
    chartData,
    recentTransactions,
    refetch: fetchAll,
  };
}
