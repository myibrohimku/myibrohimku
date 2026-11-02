// ─── Dummy Data for MyIbrohimku CMS v2 ─

export const transactionsData = [
  { id: 1, tanggal: '2026-04-25', nama_santri: 'Ahmad Fauzi Rahman', kategori: 'SPP', tipe: 'Income', jumlah: 500000, keterangan: 'Pembayaran SPP April 2026', status: 'Lunas' },
  { id: 2, tanggal: '2026-04-24', nama_santri: 'Fatimah Zahra', kategori: 'Infaq', tipe: 'Income', jumlah: 200000, keterangan: 'Infaq bulanan', status: 'Lunas' },
  { id: 3, tanggal: '2026-04-23', nama_santri: '-', kategori: 'Makan', tipe: 'Outcome', jumlah: 1500000, keterangan: 'Belanja dapur mingguan', status: 'Lunas' },
  { id: 4, tanggal: '2026-04-22', nama_santri: 'Muhammad Rizki Pratama', kategori: 'SPP', tipe: 'Income', jumlah: 500000, keterangan: 'Pembayaran SPP April 2026', status: 'Lunas' },
  { id: 5, tanggal: '2026-04-21', nama_santri: '-', kategori: 'Lainnya', tipe: 'Outcome', jumlah: 750000, keterangan: 'Perbaikan fasilitas', status: 'Lunas' },
  { id: 6, tanggal: '2026-04-20', nama_santri: 'Umar Faruq', kategori: 'SPP', tipe: 'Income', jumlah: 500000, keterangan: 'Pembayaran SPP April 2026', status: 'Pending' },
  { id: 7, tanggal: '2026-04-19', nama_santri: 'Khadijah Nurul Huda', kategori: 'Infaq', tipe: 'Income', jumlah: 150000, keterangan: 'Infaq Jumat', status: 'Lunas' },
  { id: 8, tanggal: '2026-04-18', nama_santri: '-', kategori: 'Makan', tipe: 'Outcome', jumlah: 2000000, keterangan: 'Catering acara maulid', status: 'Lunas' },
  { id: 9, tanggal: '2026-04-17', nama_santri: 'Bilal Hakim', kategori: 'SPP', tipe: 'Income', jumlah: 500000, keterangan: 'Pembayaran SPP Maret 2026', status: 'Lunas' },
  { id: 10, tanggal: '2026-04-16', nama_santri: 'Zainab Husna', kategori: 'SPP', tipe: 'Income', jumlah: 500000, keterangan: 'Pembayaran SPP April 2026', status: 'Lunas' },
];


export const unpaidData = [
  { id: 1, nama_santri: 'Muhammad Rizki Pratama', kamar: 'Al-Fatih 2', total_tagihan: 1000000, items: [{ kategori: 'SPP', bulan: 'Maret 2026', jumlah: 500000 }, { kategori: 'SPP', bulan: 'April 2026', jumlah: 500000 }] },
  { id: 2, nama_santri: 'Aisyah Putri Ramadhani', kamar: 'Khadijah 2', total_tagihan: 700000, items: [{ kategori: 'SPP', bulan: 'April 2026', jumlah: 500000 }, { kategori: 'Infaq', bulan: 'April 2026', jumlah: 200000 }] },
  { id: 3, nama_santri: 'Umar Faruq', kamar: 'Al-Fatih 1', total_tagihan: 500000, items: [{ kategori: 'SPP', bulan: 'April 2026', jumlah: 500000 }] },
  { id: 4, nama_santri: 'Bilal Hakim', kamar: 'Al-Fatih 2', total_tagihan: 1500000, items: [{ kategori: 'SPP', bulan: 'Feb 2026', jumlah: 500000 }, { kategori: 'SPP', bulan: 'Maret 2026', jumlah: 500000 }, { kategori: 'SPP', bulan: 'April 2026', jumlah: 500000 }] },
  { id: 5, nama_santri: 'Zainab Husna', kamar: 'Khadijah 2', total_tagihan: 300000, items: [{ kategori: 'Makan', bulan: 'April 2026', jumlah: 300000 }] },
];

export const dashboardStats = {
  totalSaldo: 12500000,
  income: 3350000,
  outcome: 4250000,
  totalSantri: 8,
  trendSaldo: { direction: 'up', value: '+5.2%' },
  trendIncome: { direction: 'up', value: '+12.3%' },
  trendOutcome: { direction: 'down', value: '-3.1%' },
  trendSantri: { direction: 'up', value: '+2' },
};

export const chartData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'],
  income: [4200000, 3800000, 5100000, 3350000, 0, 0],
  outcome: [3500000, 4100000, 3200000, 4250000, 0, 0],
};

export const kategoriOptions = [
  { value: 'ld', label: 'Loundry' },
  { value: 'ks', label: 'Kas Asrama' },
  { value: 'gl', label: 'Galon' },
];

export const bulanOptions = [
  { value: 'all', label: 'Semua' },
  { value: '01', label: 'Januari' },
  { value: '02', label: 'Februari' },
  { value: '03', label: 'Maret' },
  { value: '04', label: 'April' },
  { value: '05', label: 'Mei' },
  { value: '06', label: 'Juni' },
  { value: '07', label: 'Juli' },
  { value: '08', label: 'Agustus' },
  { value: '09', label: 'September' },
  { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },
  { value: '12', label: 'Desember' },
];

export const totalsantriOptions = [
  { value: 'all', label: 'Semua' },
  { value: 'pengurus', label: 'Pengurus' },
  { value: 'santri', label: 'Santri' },
  { value: 'sma', label: 'SMA' },
  { value: 'smk', label: 'SMK' },
];

export const kamarOptions = [
  { value: 'semua', label: 'Semua Kamar' },
  { value: 'Al-Fatih 1', label: 'Al-Fatih 1' },
  { value: 'Al-Fatih 2', label: 'Al-Fatih 2' },
  { value: 'Khadijah 1', label: 'Khadijah 1' },
  { value: 'Khadijah 2', label: 'Khadijah 2' },
];

export const statusOptions = [
  { value: 'semua', label: 'Semua Status' },
  { value: 'Aktif', label: 'Aktif' },
  { value: 'Nonaktif', label: 'Nonaktif' },
];

export const instansiOptions = [
  { value: 'semua', label: 'Semua Instansi' },
  { value: 'SMA', label: 'SMA' },
  { value: 'SMK', label: 'SMK' },
  { value: 'MA', label: 'MA' },
  { value: 'MTs', label: 'MTs' },
  { value: 'SMP', label: 'SMP' },
];

export function formatRupiah(num) {
  return 'Rp ' + Number(num).toLocaleString('id-ID');
}

export function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}
