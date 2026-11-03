import { useMemo } from 'react';
import { Wallet, TrendingUp, TrendingDown, Users, AlertCircle, RefreshCw, ArrowUpRight, ArrowDownRight, Activity, Tag, Calendar } from 'lucide-react';
import RoomInfoCard from '../components/ui/RoomInfoCard';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip as ChartTooltip, Legend, Filler
} from 'chart.js';
import { StatCard } from '../components/ui/Card';
import Dropdown from '../components/ui/Dropdown';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { useDashboard } from '../hooks/useDashboard';
import { formatRupiah } from '../data/dummyData';
import './Dashboard.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, ChartTooltip, Legend, Filler);

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

const formatDateTime = (str) => {
  if (!str) return '-';
  const d = new Date(str);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatTrend = (value) => {
  if (value === null || value === undefined) return null;
  const num = parseFloat(value);
  if (isNaN(num)) return null;
  return (num >= 0 ? '+' : '') + num + '%';
};

/** Cari titik dengan nilai tertinggi pada data grafik */
const getPeak = (arr) => {
  if (!arr || arr.length === 0) return null;
  const max = Math.max(...arr);
  if (max === 0) return null;
  const idx = arr.indexOf(max);
  return { index: idx, value: max };
};

export default function Dashboard() {
  const {
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
    refetch,
  } = useDashboard();

  const activeCategoryLabel =
    categoryFilter === 'all'
      ? null
      : categories.find((c) => c.value === categoryFilter)?.label;

  const yearOptions = useMemo(() => {
    if (!availableYears || availableYears.length === 0) {
      return [{ value: new Date().getFullYear(), label: String(new Date().getFullYear()) }];
    }
    return availableYears;
  }, [availableYears]);

  // Rasio keuangan (kartu & grafik menyajikan periode yang sama)
  const spendingRatio = stats.totalIncome > 0
    ? Math.round((stats.totalOutcome / stats.totalIncome) * 100)
    : 0;

  // Tunggakan bersifat tahunan — rasionya terhadap total pemasukan SETAHUN.
  const unpaidPercent = stats.annualIncome > 0
    ? Math.min(100, Math.round((stats.unpaidTotal / stats.annualIncome) * 100))
    : 0;

  const trendIncome = formatTrend(stats.incomeTrend);

  const isMonthView = month !== 'all';
  const monthViewLabel = isMonthView
    ? `${MONTH_LABELS_FULL[parseInt(month, 10)]} ${year}`
    : null;

  // Titik puncak pemasukan & pengeluaran (mengikuti skala grafik yang tampil)
  const isDailyView = chartData.granularity === 'day';
  const peakIncome  = useMemo(() => getPeak(chartData.income),  [chartData.income]);
  const peakOutcome = useMemo(() => getPeak(chartData.outcome), [chartData.outcome]);
  const formatPeakLabel = (p) =>
    p ? (isDailyView ? `Tgl ${p.index + 1}` : MONTH_LABELS[p.index]) : null;

  // Jumlah bulan aktif (ada transaksi)
  const activeMonths = useMemo(() => {
    return (chartByMonth.income || []).filter(v => v > 0).length;
  }, [chartByMonth.income]);

  // Rata-rata pemasukan bulanan (hanya bulan aktif) — khusus tampilan tahunan
  const avgMonthlyIncome = !isMonthView && activeMonths > 0
    ? Math.round(stats.totalIncome / activeMonths)
    : 0;

  const recentColumns = [
    {
      key: 'created_at',
      label: 'Tanggal',
      render: (v) => formatDateTime(v),
    },
    {
      key: 'type',
      label: 'Tipe',
      render: (v) => (
        <Badge variant={v === 'income' ? 'badge--green' : 'badge--red'}>
          {v === 'income' ? 'Masuk' : 'Keluar'}
        </Badge>
      ),
    },
    { key: 'nama', label: 'Nama / Keterangan' },
    {
      key: 'nominal',
      label: 'Nominal',
      render: (v, item) => (
        <span className={`amount amount--${item.type}`}>{formatRupiah(v)}</span>
      ),
    },
  ];

  const lineChartData = {
    labels: chartData.labels,
    datasets: [
      {
        label: 'Pemasukan',
        data: chartData.income,
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.08)',
        fill: false,
        tension: 0.4,
        borderWidth: 2.5,
        pointRadius: 4,
        pointBackgroundColor: '#22c55e',
        pointHoverRadius: 6,
      },
      {
        label: 'Pengeluaran',
        data: chartData.outcome,
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
        fill: false,
        tension: 0.4,
        borderWidth: 2.5,
        pointRadius: 4,
        pointBackgroundColor: '#ef4444',
        pointHoverRadius: 6,
      },
    ],
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'top',
        labels: { usePointStyle: true, padding: 20, font: { size: 12 } },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.dataset.label}: ${formatRupiah(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (v) => {
            if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}jt`;
            if (v >= 1_000) return `${(v / 1_000).toFixed(0)}rb`;
            return v;
          },
        },
        grid: { color: 'rgba(0,0,0,0.04)' },
      },
      x: { grid: { display: false } },
    },
  };

  return (
    <div className="dashboard animate-fade-in" id="dashboard-page">
      <div className="page-header dashboard__page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Ringkasan keuangan &amp; data pesantren — Tahun {year}
            {!loading && activeMonths > 0 && !isMonthView && (
              <span className="dashboard__subtitle-pill">
                {activeMonths} bulan aktif
              </span>
            )}
            {!loading && isMonthView && (
              <span className="dashboard__subtitle-pill">
                {MONTH_LABELS_FULL[parseInt(month, 10)]} {year}
              </span>
            )}
            {!loading && activeCategoryLabel && (
              <span className="dashboard__subtitle-pill">
                {activeCategoryLabel}
              </span>
            )}
          </p>
        </div>
        <div className="dashboard__header-actions">
          <Dropdown
            icon={Tag}
            options={categories}
            value={categoryFilter}
            onChange={setCategoryFilter}
            size="sm"
            placeholder="Kategori"
          />
          <Dropdown
            options={yearOptions}
            value={year}
            onChange={(v) => setYear(Number(v))}
            size="sm"
            placeholder="Tahun"
          />
          <Dropdown
            icon={Calendar}
            options={MONTH_OPTIONS}
            value={month}
            onChange={setMonth}
            size="sm"
            placeholder="Bulan"
          />
          <Button variant="ghost" icon={RefreshCw} onClick={refetch} size="sm" title="Refresh">
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="dashboard__stats">
        {/* Saldo Bersih */}
        <StatCard
          icon={Wallet}
          title="Saldo Bersih"
          value={loading ? '...' : formatRupiah(stats.saldo)}
          trend={stats.saldo >= 0 ? 'up' : 'down'}
          color="primary"
        >
          {!loading && (
            <div className="stat-card__meta">
              <span className={stats.saldo >= 0 ? 'meta--positive' : 'meta--negative'}>
                {stats.saldo >= 0 ? 'Surplus' : 'Defisit'} {isMonthView ? monthViewLabel : `tahun ${year}`}
              </span>
            </div>
          )}
        </StatCard>

        {/* Total Pemasukan */}
        <StatCard
          icon={TrendingUp}
          title="Total Pemasukan"
          value={loading ? '...' : formatRupiah(stats.totalIncome)}
          trend="up"
          trendValue={trendIncome}
          color="green"
        >
          {!loading && avgMonthlyIncome > 0 && (
            <div className="stat-card__meta">
              <span className="meta--neutral">
                Rata-rata {formatRupiah(avgMonthlyIncome)}/bln
              </span>
            </div>
          )}
          {!loading && isMonthView && (
            <div className="stat-card__meta">
              <span className="meta--neutral">{stats.incomeTxCount} transaksi</span>
            </div>
          )}
        </StatCard>

        {/* Total Pengeluaran */}
        <StatCard
          icon={TrendingDown}
          title="Total Pengeluaran"
          value={loading ? '...' : formatRupiah(stats.totalOutcome)}
          color="red"
        >
          {!loading && stats.totalIncome > 0 && (
            <div className="stat-card__meta">
              <span className={spendingRatio > 80 ? 'meta--negative' : spendingRatio > 60 ? 'meta--warning' : 'meta--positive'}>
                {spendingRatio}% dari pemasukan
              </span>
            </div>
          )}
        </StatCard>

        {/* Total Santri Aktif */}
        <StatCard
          icon={Users}
          title="Total Santri Aktif"
          value={loading ? '...' : stats.totalSantri.toString()}
          color="secondary"
        >
          {!loading && stats.unpaidCount > 0 && (
            <div className="stat-card__meta">
              <span className="meta--warning">
                {stats.unpaidCount} santri menunggak
              </span>
            </div>
          )}
        </StatCard>
      </div>

      {/* ── Room Info Card ── */}
      <RoomInfoCard />

      {/* ── Chart + Unpaid Summary ── */}
      <div className="dashboard__charts">
        <div className="card card--padded dashboard__chart-card">
          <div className="dashboard__chart-header">
            <h3 className="dashboard__section-title">
              Grafik Keuangan {month === 'all'
                ? year
                : `${MONTH_LABELS_FULL[parseInt(month, 10)]} ${year}`}
              {isDailyView && <span className="dashboard__subtitle-pill">skala harian</span>}
            </h3>
            {!loading && (peakIncome || peakOutcome) && (
              <div className="dashboard__chart-peaks">
                {peakIncome && (
                  <span className="dashboard__peak dashboard__peak--income">
                    <ArrowUpRight size={13} />
                    Puncak masuk: {formatPeakLabel(peakIncome)} ({formatRupiah(peakIncome.value)})
                  </span>
                )}
                {peakOutcome && (
                  <span className="dashboard__peak dashboard__peak--outcome">
                    <ArrowDownRight size={13} />
                    Puncak keluar: {formatPeakLabel(peakOutcome)} ({formatRupiah(peakOutcome.value)})
                  </span>
                )}
              </div>
            )}
          </div>
          {loading ? (
            <div className="dashboard__loading-chart">
              <div className="spinner" />
              <span>Memuat grafik...</span>
            </div>
          ) : (
            <div className="dashboard__chart-container">
              <Line data={lineChartData} options={lineChartOptions} />
            </div>
          )}
        </div>

        <div className="card card--padded dashboard__unpaid-card">
          <div className="dashboard__unpaid-header">
            <AlertCircle size={18} className="dashboard__unpaid-icon" />
            <h3 className="dashboard__section-title" style={{ marginBottom: 0 }}>
              Tunggakan Tahun {year}
            </h3>
          </div>
          {loading ? (
            <div className="dashboard__loading-chart">
              <div className="spinner" />
            </div>
          ) : stats.unpaidTotal === 0 ? (
            <div className="dashboard__unpaid-clear">
              <Activity size={32} className="dashboard__clear-icon" />
              <p className="dashboard__clear-text">Tidak ada tunggakan!</p>
              <span className="dashboard__clear-sub">Semua tagihan tahun {year} lunas</span>
            </div>
          ) : (
            <>
              <div className="dashboard__unpaid-value">{formatRupiah(stats.unpaidTotal)}</div>
              <p className="dashboard__unpaid-count">
                {stats.unpaidCount} santri memiliki tunggakan aktif
              </p>
              <div className="dashboard__unpaid-bar">
                <div
                  className="dashboard__unpaid-progress"
                  style={{ width: `${unpaidPercent}%` }}
                />
              </div>
              <div className="dashboard__unpaid-footer">
                <span className="dashboard__unpaid-label">
                  {unpaidPercent}% dari total pemasukan {year}
                </span>
                <span className={`dashboard__unpaid-badge ${unpaidPercent > 20 ? 'badge--danger' : 'badge--warning'}`}>
                  {unpaidPercent > 20 ? 'Perlu Perhatian' : 'Normal'}
                </span>
              </div>
            </>
          )}
        </div>
      </div>



      {/* ── Recent Transactions ── */}
      <div className="card card--padded dashboard__recent">
        <div className="dashboard__recent-header">
          <h3 className="dashboard__section-title" style={{ marginBottom: 0 }}>
            Transaksi Terbaru
          </h3>
          {!loading && recentTransactions.length > 0 && (
            <span className="dashboard__recent-count">
              {recentTransactions.length} transaksi terakhir
            </span>
          )}
        </div>
        {loading ? (
          <div className="dashboard__loading-chart">
            <div className="spinner" />
            <span>Memuat transaksi...</span>
          </div>
        ) : recentTransactions.length === 0 ? (
          <p style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: '2rem 0' }}>
            Tidak ada transaksi yang cocok dengan filter kategori aktif
          </p>
        ) : (
          <Table columns={recentColumns} data={recentTransactions} />
        )}
      </div>
    </div>
  );
}