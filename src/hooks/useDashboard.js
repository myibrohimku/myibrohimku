import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export function useDashboard() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [incomeData, setIncomeData] = useState([]);
  const [outcomeData, setOutcomeData] = useState([]);
  const [totalSantri, setTotalSantri] = useState(0);
  const [unpaidCount, setUnpaidCount] = useState(0);
  const [unpaidTotal, setUnpaidTotal] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [
        resSantri,
        resIncome,
        resOutcome,
        resUnpaid,
        resRecentIncome,
        resRecentOutcome,
        resYears
      ] = await Promise.all([
        // Total santri aktif — berdasarkan status_id di ref_status_santri
        supabase
          .from('databasesantri')
          .select('id, ref_status_santri(nama_status)')
          .eq('is_deleted', false),

        // Pemasukan per bulan untuk tahun terpilih
        supabase
          .from('transaksi_pemasukan')
          .select('nominal, created_at')
          .gte('created_at', `${year}-01-01T00:00:00`)
          .lte('created_at', `${year}-12-31T23:59:59`),

        // Pengeluaran per bulan untuk tahun terpilih
        supabase
          .from('transaksi_pengeluaran')
          .select('nominal, created_at')
          .gte('created_at', `${year}-01-01T00:00:00`)
          .lte('created_at', `${year}-12-31T23:59:59`),

        // Tagihan belum lunas (nominal_santri vs transaksi_pemasukan)
        supabase
          .from('nominal_santri')
          .select('santri_id, jenis_bayar, nominal, tahun')
          .eq('tahun', year),

        // Recent income (5 terakhir)
        supabase
          .from('transaksi_pemasukan')
          .select('id, nominal, jenis_bayar, created_at, databasesantri(nama, nia)')
          .order('created_at', { ascending: false })
          .limit(5),

        // Recent outcome (5 terakhir)
        supabase
          .from('transaksi_pengeluaran')
          .select('id, nominal, deskripsi, created_at, urgensi_id')
          .order('created_at', { ascending: false })
          .limit(5),

        // Tahun yang tersedia dari nominal_santri
        supabase
          .from('nominal_santri')
          .select('tahun'),
      ]);

      // Total Santri Aktif — hitung berdasarkan status_id → ref_status_santri.nama_status = 'aktif'
      if (!resSantri.error && resSantri.data) {
        const aktifCount = resSantri.data.filter(s =>
          (s.ref_status_santri?.nama_status || '').toLowerCase() === 'aktif'
        ).length;
        setTotalSantri(aktifCount);
      }

      // Income per bulan
      if (resIncome.data) {
        setIncomeData(resIncome.data);
      }

      // Outcome per bulan
      if (resOutcome.data) {
        setOutcomeData(resOutcome.data);
      }

      // Hitung tagihan belum lunas
      if (resUnpaid.data) {
        // Fetch semua transaksi pemasukan untuk tahun ini
        const { data: payments } = await supabase
          .from('transaksi_pemasukan')
          .select('santri_id, jenis_bayar, nominal')
          .eq('tahun_bayar', year);

        const paymentsMap = {};
        (payments || []).forEach(p => {
          const jid = (p.jenis_bayar || '').toLowerCase();
          const key = `${p.santri_id}-${jid}`;
          paymentsMap[key] = (paymentsMap[key] || 0) + Number(p.nominal || 0);
        });

        let unpaidSantriSet = new Set();
        let totalUnpaid = 0;

        resUnpaid.data.forEach(n => {
          const jid = (n.jenis_bayar || '').toLowerCase();
          const key = `${n.santri_id}-${jid}`;
          const paid = paymentsMap[key] || 0;
          const target = Number(n.nominal || 0);
          if (target > 0 && paid < target) {
            unpaidSantriSet.add(n.santri_id);
            totalUnpaid += (target - paid);
          }
        });

        setUnpaidCount(unpaidSantriSet.size);
        setUnpaidTotal(totalUnpaid);
      }

      // Recent Transactions (gabungan income + outcome, 5 terbaru)
      const combinedRecent = [
        ...(resRecentIncome.data || []).map(i => ({
          id: `inc-${i.id}`,
          type: 'income',
          nama: i.databasesantri?.nama || '-',
          keterangan: i.jenis_bayar,
          nominal: Number(i.nominal || 0),
          created_at: i.created_at,
        })),
        ...(resRecentOutcome.data || []).map(o => ({
          id: `out-${o.id}`,
          type: 'outcome',
          nama: o.deskripsi || '-',
          keterangan: o.urgensi_id,
          nominal: Number(o.nominal || 0),
          created_at: o.created_at,
        })),
      ];
      combinedRecent.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setRecentTransactions(combinedRecent.slice(0, 8));

      // Available years
      if (resYears.data) {
        const years = [...new Set(resYears.data.map(d => d.tahun))].sort((a, b) => b - a);
        if (!years.includes(currentYear)) years.unshift(currentYear);
        setAvailableYears(years.map(y => ({ value: y, label: String(y) })));
      }

    } catch (err) {
      console.error('[useDashboard] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Kalkulasi per bulan ──────────────────────────────────────────────────
  const chartByMonth = useMemo(() => {
    const incomeByMonth = Array(12).fill(0);
    const outcomeByMonth = Array(12).fill(0);

    incomeData.forEach(t => {
      const d = new Date(t.created_at);
      if (!isNaN(d)) incomeByMonth[d.getMonth()] += Number(t.nominal || 0);
    });

    outcomeData.forEach(t => {
      const d = new Date(t.created_at);
      if (!isNaN(d)) outcomeByMonth[d.getMonth()] += Number(t.nominal || 0);
    });

    return {
      labels: MONTH_LABELS,
      income: incomeByMonth,
      outcome: outcomeByMonth,
    };
  }, [incomeData, outcomeData]);

  // ── Ringkasan stat ───────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalIncome  = incomeData.reduce((s, t) => s + Number(t.nominal || 0), 0);
    const totalOutcome = outcomeData.reduce((s, t) => s + Number(t.nominal || 0), 0);
    const saldo = totalIncome - totalOutcome;

    // Hitung tren: bandingkan bulan ini vs bulan lalu
    const now = new Date();
    const thisMonth = now.getMonth();
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;

    const incomeThisMonth = incomeData
      .filter(t => new Date(t.created_at).getMonth() === thisMonth)
      .reduce((s, t) => s + Number(t.nominal || 0), 0);
    const incomeLastMonth = incomeData
      .filter(t => new Date(t.created_at).getMonth() === lastMonth)
      .reduce((s, t) => s + Number(t.nominal || 0), 0);

    const incomeTrend = incomeLastMonth > 0
      ? (((incomeThisMonth - incomeLastMonth) / incomeLastMonth) * 100).toFixed(1)
      : null;

    return {
      totalIncome,
      totalOutcome,
      saldo,
      totalSantri,
      unpaidCount,
      unpaidTotal,
      incomeTrend,
    };
  }, [incomeData, outcomeData, totalSantri, unpaidCount, unpaidTotal]);

  return {
    loading,
    year,
    setYear,
    availableYears,
    stats,
    chartByMonth,
    recentTransactions,
    refetch: fetchAll,
  };
}
