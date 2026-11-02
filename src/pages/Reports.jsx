import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart3, Download, RefreshCw, TrendingUp, TrendingDown,
  DollarSign, PieChart, Activity, CheckCircle2
} from 'lucide-react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  Title, Tooltip as ChartTooltip, Legend
} from 'chart.js';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Dropdown from '../components/ui/Dropdown';
import Badge from '../components/ui/Badge';
import Table from '../components/ui/Table';
import { supabase } from '../lib/supabaseClient';
import { formatRupiah } from '../data/dummyData';
import './Reports.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, ChartTooltip, Legend);

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const MONTH_LABELS_FULL = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];
const MONTH_OPTIONS = [
  { value: 'all', label: 'Semua Bulan' },
  { value: '0',  label: 'Januari' },   { value: '1',  label: 'Februari' },
  { value: '2',  label: 'Maret' },     { value: '3',  label: 'April' },
  { value: '4',  label: 'Mei' },       { value: '5',  label: 'Juni' },
  { value: '6',  label: 'Juli' },      { value: '7',  label: 'Agustus' },
  { value: '8',  label: 'September' }, { value: '9',  label: 'Oktober' },
  { value: '10', label: 'November' },  { value: '11', label: 'Desember' },
];

const currentYear = new Date().getFullYear();

/** Format angka singkat: 1.500.000 → 1,5jt */
const formatShort = (v) => {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}M`;
  if (v >= 1_000_000)     return `${(v / 1_000_000).toFixed(1)}jt`;
  if (v >= 1_000)         return `${(v / 1_000).toFixed(0)}rb`;
  return String(v);
};

export default function Reports() {
  const [year,  setYear]  = useState(currentYear);
  const [month, setMonth] = useState('all');

  const [incomeRaw,   setIncomeRaw]   = useState([]);
  const [outcomeRaw,  setOutcomeRaw]  = useState([]);
  const [topItems,    setTopItems]    = useState([]);
  const [topOutItems, setTopOutItems] = useState([]);
  const [jenisBayarMap, setJenisBayarMap] = useState({}); // id → label
  const [yearOptions, setYearOptions] = useState([{ value: currentYear, label: String(currentYear) }]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resIncome, resOutcome, resYears, resTopIncome, resTopOutcome, resJenis] = await Promise.all([
        supabase
          .from('transaksi_pemasukan')
          .select('nominal, created_at, jenis_bayar')
          .gte('created_at', `${year}-01-01`)
          .lte('created_at', `${year}-12-31`),

        supabase
          .from('transaksi_pengeluaran')
          .select('nominal, created_at, deskripsi, urgensi_id')
          .gte('created_at', `${year}-01-01`)
          .lte('created_at', `${year}-12-31`),

        supabase.from('nominal_santri').select('tahun'),

        // Top kontribusi jenis bayar (pemasukan)
        supabase
          .from('transaksi_pemasukan')
          .select('jenis_bayar, nominal')
          .gte('created_at', `${year}-01-01`)
          .lte('created_at', `${year}-12-31`),

        // Top pengeluaran per deskripsi
        supabase
          .from('transaksi_pengeluaran')
          .select('deskripsi, nominal')
          .gte('created_at', `${year}-01-01`)
          .lte('created_at', `${year}-12-31`),

        // Master jenis bayar — untuk resolve ID ke label
        supabase.from('ref_transak_bln').select('id_transak_bln, label_transak_bln'),
      ]);

      if (resIncome.data)  setIncomeRaw(resIncome.data);
      if (resOutcome.data) setOutcomeRaw(resOutcome.data);

      // Build jenis bayar lookup map: id → label
      const jenisBayarLookup = {};
      if (resJenis.data) {
        resJenis.data.forEach(j => {
          jenisBayarLookup[j.id_transak_bln] = j.label_transak_bln;
        });
        setJenisBayarMap(jenisBayarLookup);
      }

      // Top jenis bayar (pemasukan) — resolve ID ke label
      if (resTopIncome.data) {
        const map = {};
        resTopIncome.data.forEach(t => {
          const rawId = t.jenis_bayar || 'Lainnya';
          const key   = jenisBayarLookup[rawId] || rawId; // tampilkan label jika ada
          map[key] = (map[key] || 0) + Number(t.nominal || 0);
        });
        const sorted = Object.entries(map)
          .map(([jenis, total]) => ({ jenis, total }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 5);
        setTopItems(sorted);
      }

      // Top deskripsi pengeluaran
      if (resTopOutcome.data) {
        const map = {};
        resTopOutcome.data.forEach(t => {
          const key = t.deskripsi || 'Lainnya';
          map[key] = (map[key] || 0) + Number(t.nominal || 0);
        });
        const sorted = Object.entries(map)
          .map(([deskripsi, total]) => ({ deskripsi, total }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 5);
        setTopOutItems(sorted);
      }

      if (resYears.data) {
        const years = [...new Set(resYears.data.map(d => d.tahun))].sort((a, b) => b - a);
        if (!years.includes(currentYear)) years.unshift(currentYear);
        setYearOptions(years.map(y => ({ value: y, label: String(y) })));
      }

    } catch (err) {
      console.error('[Reports] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Filter by month ──────────────────────────────────────────────────────
  const filteredIncome = useMemo(() => {
    if (month === 'all') return incomeRaw;
    const m = parseInt(month, 10);
    return incomeRaw.filter(t => new Date(t.created_at).getMonth() === m);
  }, [incomeRaw, month]);

  const filteredOutcome = useMemo(() => {
    if (month === 'all') return outcomeRaw;
    const m = parseInt(month, 10);
    return outcomeRaw.filter(t => new Date(t.created_at).getMonth() === m);
  }, [outcomeRaw, month]);

  // ── Agregasi per bulan ───────────────────────────────────────────────────
  const chartByMonth = useMemo(() => {
    const inc = Array(12).fill(0);
    const out = Array(12).fill(0);
    incomeRaw.forEach(t => {
      const m = new Date(t.created_at).getMonth();
      if (!isNaN(m)) inc[m] += Number(t.nominal || 0);
    });
    outcomeRaw.forEach(t => {
      const m = new Date(t.created_at).getMonth();
      if (!isNaN(m)) out[m] += Number(t.nominal || 0);
    });
    return { income: inc, outcome: out };
  }, [incomeRaw, outcomeRaw]);

  // ── Stat totals ──────────────────────────────────────────────────────────
  const totalIncome  = filteredIncome.reduce((s, t)  => s + Number(t.nominal || 0), 0);
  const totalOutcome = filteredOutcome.reduce((s, t) => s + Number(t.nominal || 0), 0);
  const surplus      = totalIncome - totalOutcome;

  // Rasio efisiensi (pengeluaran / pemasukan * 100)
  const efficiencyRatio = totalIncome > 0 ? Math.round((totalOutcome / totalIncome) * 100) : 0;

  // Bulan aktif (ada transaksi pemasukan)
  const activeMonths = useMemo(
    () => chartByMonth.income.filter(v => v > 0).length,
    [chartByMonth.income]
  );

  // Rata-rata per bulan (hanya bulan aktif)
  const avgIncome  = activeMonths > 0 ? Math.round(totalIncome  / activeMonths) : 0;
  const avgOutcome = activeMonths > 0 ? Math.round(totalOutcome / activeMonths) : 0;

  // Bulan dengan pemasukan tertinggi
  const peakIncomeMonth = useMemo(() => {
    const max = Math.max(...chartByMonth.income);
    if (max === 0) return null;
    const idx = chartByMonth.income.indexOf(max);
    return { label: MONTH_LABELS_FULL[idx], value: max };
  }, [chartByMonth.income]);

  // ── Bar chart ────────────────────────────────────────────────────────────
  const barData = {
    labels: MONTH_LABELS,
    datasets: [
      {
        label: 'Pemasukan',
        data: chartByMonth.income,
        backgroundColor: 'rgba(74, 0, 255, 0.75)',
        borderRadius: 6,
        borderSkipped: false,
      },
      {
        label: 'Pengeluaran',
        data: chartByMonth.outcome,
        backgroundColor: 'rgba(239, 68, 68, 0.75)',
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'top', labels: { usePointStyle: true, padding: 20 } },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.dataset.label}: ${formatRupiah(ctx.parsed.y)}`,
          afterBody: (items) => {
            const inc = items.find(i => i.dataset.label === 'Pemasukan')?.parsed.y || 0;
            const out = items.find(i => i.dataset.label === 'Pengeluaran')?.parsed.y || 0;
            const net = inc - out;
            if (inc === 0 && out === 0) return [];
            return [``, ` Net: ${net >= 0 ? '+' : ''}${formatRupiah(net)}`];
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (v) => {
            if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}jt`;
            if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}rb`;
            return v;
          },
        },
        grid: { color: 'rgba(0,0,0,0.04)' },
      },
      x: { grid: { display: false } },
    },
  };

  // ── Export CSV ───────────────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    const rows = [
      ['Bulan', 'Pemasukan', 'Pengeluaran', 'Net'],
      ...MONTH_LABELS.map((label, i) => {
        const inc = chartByMonth.income[i];
        const out = chartByMonth.outcome[i];
        return [label, inc, out, inc - out];
      }),
      ['TOTAL', totalIncome, totalOutcome, surplus],
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `laporan_keuangan_${year}${month !== 'all' ? `_bln${parseInt(month, 10) + 1}` : ''}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [chartByMonth, year, month, totalIncome, totalOutcome, surplus]);

  // ── Label periode ─────────────────────────────────────────────────────────
  const periodLabel = month === 'all'
    ? `Tahun ${year}`
    : `${MONTH_OPTIONS.find(m2 => m2.value === month)?.label} ${year}`;

  const isMonthView = month !== 'all';

  return (
    <div className="reports animate-fade-in">
      <div className="page-header reports__page-header">
        <div>
          <h1 className="page-title">Laporan Keuangan</h1>
          <p className="page-subtitle">
            Analisis pemasukan &amp; pengeluaran —&nbsp;
            <strong>{periodLabel}</strong>
            {!loading && activeMonths > 0 && !isMonthView && (
              <span className="reports__subtitle-pill">{activeMonths} bulan aktif</span>
            )}
          </p>
        </div>
        <div className="reports__header-actions">
          <Button variant="ghost" icon={Download} onClick={handleExport} size="sm" title="Export CSV">
            Export CSV
          </Button>
          <Button variant="ghost" icon={RefreshCw} onClick={fetchData} size="sm">
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Filter ── */}
      <div className="card card--padded reports__filter">
        <div className="reports__filter-row">
          <Dropdown
            label="Tahun"
            options={yearOptions}
            value={year}
            onChange={(v) => setYear(Number(v))}
          />
          <Dropdown
            label="Bulan"
            options={MONTH_OPTIONS}
            value={month}
            onChange={setMonth}
          />
          {!loading && (
            <div className="reports__filter-summary">
              <span>Menampilkan data</span>
              <strong>{periodLabel}</strong>
            </div>
          )}
        </div>
      </div>

      {/* ── Stat Summary ── */}
      <div className="reports__stat-row">
        {/* Pemasukan */}
        <div className="reports__stat-card reports__stat-card--income">
          <div className="reports__stat-icon"><TrendingUp size={22} /></div>
          <div className="reports__stat-body">
            <div className="reports__stat-label">Total Pemasukan</div>
            <div className="reports__stat-value">
              {loading ? '...' : formatRupiah(totalIncome)}
            </div>
            {!loading && !isMonthView && avgIncome > 0 && (
              <div className="reports__stat-sub">
                Rata-rata {formatShort(avgIncome)}/bln
              </div>
            )}
            {!loading && isMonthView && (
              <div className="reports__stat-sub">{filteredIncome.length} transaksi</div>
            )}
          </div>
        </div>

        {/* Pengeluaran */}
        <div className="reports__stat-card reports__stat-card--outcome">
          <div className="reports__stat-icon"><TrendingDown size={22} /></div>
          <div className="reports__stat-body">
            <div className="reports__stat-label">Total Pengeluaran</div>
            <div className="reports__stat-value">
              {loading ? '...' : formatRupiah(totalOutcome)}
            </div>
            {!loading && totalIncome > 0 && (
              <div className={`reports__stat-sub ${efficiencyRatio > 80 ? 'text-red' : efficiencyRatio > 60 ? 'text-orange' : 'text-green'}`}>
                {efficiencyRatio}% dari pemasukan
              </div>
            )}
          </div>
        </div>

        {/* Surplus / Defisit */}
        <div className={`reports__stat-card ${surplus >= 0 ? 'reports__stat-card--surplus' : 'reports__stat-card--deficit'}`}>
          <div className="reports__stat-icon">
            {surplus >= 0 ? <CheckCircle2 size={22} /> : <Activity size={22} />}
          </div>
          <div className="reports__stat-body">
            <div className="reports__stat-label">
              {surplus >= 0 ? '✅ Surplus' : '⚠️ Defisit'}
            </div>
            <div className="reports__stat-value">
              {loading ? '...' : formatRupiah(Math.abs(surplus))}
            </div>
            {!loading && totalIncome > 0 && (
              <div className={`reports__stat-sub ${surplus >= 0 ? 'text-green' : 'text-red'}`}>
                {surplus >= 0
                  ? `${Math.round((surplus / totalIncome) * 100)}% dari pemasukan disimpan`
                  : `Defisit ${Math.round((Math.abs(surplus) / totalIncome) * 100)}% dari pemasukan`
                }
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Chart + Top Items ── */}
      <div className="reports__content">
        <div className="card card--padded reports__chart">
          <div className="reports__chart-header">
            <h3 className="dashboard__section-title" style={{ marginBottom: 0 }}>
              Perbandingan Bulanan {year}
            </h3>
            {!loading && peakIncomeMonth && !isMonthView && (
              <span className="reports__peak-badge">
                📈 Puncak: {peakIncomeMonth.label} ({formatShort(peakIncomeMonth.value)})
              </span>
            )}
          </div>
          {loading ? (
            <div className="reports__loading">
              <div className="spinner" />
              <span>Memuat grafik...</span>
            </div>
          ) : (
            <div className="reports__chart-container">
              <Bar data={barData} options={barOptions} />
            </div>
          )}
        </div>

        <div className="reports__side">
          {/* Top Pemasukan per Jenis */}
          <div className="card card--padded reports__top-card">
            <h3 className="dashboard__section-title">
              Top Sumber Pemasukan
              {!loading && topItems.length > 0 && (
                <span className="reports__top-count">{topItems.length} kategori</span>
              )}
            </h3>
            {loading ? (
              <div className="reports__loading"><div className="spinner" /></div>
            ) : topItems.length === 0 ? (
              <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>Tidak ada data pemasukan</p>
            ) : (
              topItems.map((item, i) => {
                const maxVal = topItems[0]?.total || 1;
                const pct = Math.round((item.total / maxVal) * 100);
                const totalPct = totalIncome > 0 ? Math.round((item.total / totalIncome) * 100) : 0;
                return (
                  <div key={i} className="reports__top-item">
                    <div className="reports__top-item-row">
                      <span className="reports__top-item-label">{item.jenis}</span>
                      <div className="reports__top-item-right">
                        <span className="reports__top-item-pct">{totalPct}%</span>
                        <span className="reports__top-item-value">{formatRupiah(item.total)}</span>
                      </div>
                    </div>
                    <div className="reports__top-bar">
                      <div className="reports__top-bar-fill reports__top-bar-fill--income" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Ringkasan Statistik */}
          <div className="card card--padded reports__summary-compact">
            <h3 className="dashboard__section-title">Ringkasan Statistik</h3>

            <div className="reports__summary-row">
              <span className="summary-card__label">Transaksi Masuk</span>
              <span className="reports__summary-count">{filteredIncome.length}x</span>
            </div>
            <div className="reports__summary-row">
              <span className="summary-card__label">Transaksi Keluar</span>
              <span className="reports__summary-count">{filteredOutcome.length}x</span>
            </div>

            {!isMonthView && activeMonths > 0 && (
              <>
                <div className="reports__summary-row">
                  <span className="summary-card__label">Rata-rata Masuk/Bln</span>
                  <span className="reports__summary-count text-green">
                    {formatShort(avgIncome)}
                  </span>
                </div>
                <div className="reports__summary-row">
                  <span className="summary-card__label">Rata-rata Keluar/Bln</span>
                  <span className="reports__summary-count text-red">
                    {formatShort(avgOutcome)}
                  </span>
                </div>
              </>
            )}

            {filteredIncome.length > 0 && (
              <div className="reports__summary-row">
                <span className="summary-card__label">Nilai Transaksi Terbesar</span>
                <span className="reports__summary-count">
                  {formatShort(Math.max(...filteredIncome.map(t => Number(t.nominal || 0))))}
                </span>
              </div>
            )}

            <div className="reports__summary-row">
              <span className="summary-card__label">Rasio Efisiensi</span>
              <span className={`reports__summary-count ${efficiencyRatio > 80 ? 'text-red' : efficiencyRatio > 60 ? 'text-orange' : 'text-green'}`}>
                {totalIncome > 0 ? `${100 - efficiencyRatio}%` : '-'}
              </span>
            </div>

            {!loading && surplus >= 0 && totalIncome > 0 && (
              <div className="reports__health-indicator reports__health-indicator--good">
                <CheckCircle2 size={14} />
                <span>Keuangan sehat — surplus {Math.round((surplus / totalIncome) * 100)}%</span>
              </div>
            )}
            {!loading && surplus < 0 && (
              <div className="reports__health-indicator reports__health-indicator--bad">
                <Activity size={14} />
                <span>Defisit — pengeluaran melebihi pemasukan</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
