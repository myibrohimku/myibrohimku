import { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import Button from '../components/ui/Button';
import { useUnpaidBilling }      from '../hooks/useUnpaidBilling';
import { useApp }                from '../context/AppContext';
import {
  generateTunggakanLandscapePDF,
  generateBulkTunggakanPDF,
} from '../lib/reportGenerator';
import UnpaidToolbar from '../components/UnpaidBilling/UnpaidToolbar';
import UnpaidCard    from '../components/UnpaidBilling/UnpaidCard';
import './UnpaidBilling.css';

export default function UnpaidBilling() {
  const {
    loading,
    year, setYear,
    categoryPrefix, setCategoryPrefix,
    searchQuery, setSearchQuery,
    categories,
    availableYears,
    data,
    refetch,
    formatPhoneNumber,
  } = useUnpaidBilling();

  const { waSettings, reportSettings } = useApp();
  const [expandedId, setExpandedId] = useState(null);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const getCatLabel = () =>
    categories.find(c => c.value === categoryPrefix)?.label || 'Iuran';

  const openWA = (phone, message) => {
    const finalPhone = formatPhoneNumber(phone);
    window.open(`https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const getReportSettings = () => ({
    ...reportSettings,
    categoryLabel:  getCatLabel(),
    namaAdmin:      waSettings.namaKasir,
    jabatanAdmin:   waSettings.jabatan,
    noRekening:     waSettings.noRekening,
  });

  // ── Toggle Expand Card ───────────────────────────────────────────────────
  const toggleExpand = (id) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  // ── Pesan WhatsApp ───────────────────────────────────────────────────────
  const buildWAMessage = (santri) => {
    const unpaidItems = santri.months.filter(m => m.isUnpaid);
    const itemsText   = unpaidItems
      .map(m => `Rp ${m.diff.toLocaleString('id-ID')} Bulan ${m.name}`)
      .join('\n');
    const catLabel    = getCatLabel();
    const firstMonth  = unpaidItems[0]?.name || '';

    return [
      `Assalamu'alaikum wrwb.`,
      ``,
      `Pangapunten nipun bu/pak Mohon Maaf Sebelumnya.`,
      `Kulo ${waSettings.namaKasir}`,
      `${waSettings.jabatan} Asrama Sayyid Ibrohim Utara.`,
      ``,
      `Ingin menyampaikan bahwa tagihan Pembayaran ${catLabel} pada bulan ${firstMonth} atas nama,`,
      santri.nama,
      `Sejumlah,`,
      itemsText || 'Tidak ada tunggakan',
      `----------------------------------------`,
      `Total = Rp ${santri.totalTunggakan.toLocaleString('id-ID')}`,
      ``,
      `Kangge Pembayaran Saget Langsung ke KETUA KAMAR MASING MASING Atau Langsung Ke Bendahara Asrama.`,
      ``,
      `Mekaten ingkang saged kawulo aturaken Bu/Pa.`,
      `Menawi gadah klentaklentunipun Nyuwun agunging pangapunten.`,
      ``,
      `Assalamu'alaikum wrwb.`,
      ``,
      `NO. REKENING`,
      waSettings.noRekening,
    ].join('\n');
  };

  const buildSingleWAMessage = (santri, month) => {
    const catLabel = getCatLabel();
    return [
      `Assalamu'alaikum wrwb.`,
      ``,
      `Pangapunten nipun bu/pak Mohon Maaf Sebelumnya.`,
      `Kulo ${waSettings.namaKasir}`,
      `${waSettings.jabatan} Asrama Sayyid Ibrohim Utara.`,
      ``,
      `Ingin menyampaikan bahwa tagihan Pembayaran ${catLabel} pada bulan ${month.name} atas nama,`,
      santri.nama,
      `Sejumlah,`,
      `Rp ${month.diff.toLocaleString('id-ID')}`,
      ``,
      `Kangge Pembayaran Saget Langsung ke KETUA KAMAR MASING MASING Atau Langsung Ke Bendahara Asrama.`,
      ``,
      `Mekaten ingkang saged kawulo aturaken Bu/Pa.`,
      `Menawi gadah klentaklentunipun Nyuwun agunging pangapunten.`,
      ``,
      `Assalamu'alaikum wrwb.`,
      ``,
      `NO. REKENING`,
      waSettings.noRekening,
    ].join('\n');
  };

  // ── Handlers ─────────────────────────────────────────────────────────────
  
  // BUG FIX: Guard — hanya kirim WA jika memang ada tunggakan
  const handleSendWA = (santri) => {
    if (!santri.no_wa_wali) return alert(`Nomor WA wali ${santri.nama} belum diisi.`);
    if (santri.totalTunggakan === 0) return alert(`${santri.nama} tidak memiliki tunggakan.`);
    openWA(santri.no_wa_wali, buildWAMessage(santri));
  };

  // BUG FIX: Guard — hanya kirim WA bulan jika bulan itu memang belum bayar
  const handleSendSingleWA = (santri, month) => {
    if (!santri.no_wa_wali) return alert(`Nomor WA wali ${santri.nama} belum diisi.`);
    if (!month.isUnpaid) return; // sudah lunas, jangan kirim
    openWA(santri.no_wa_wali, buildSingleWAMessage(santri, month));
  };

  const handlePrintPDF = (santri) =>
    generateTunggakanLandscapePDF(santri, santri.months, getReportSettings());

  const handlePrintBulkPDF = () =>
    generateBulkTunggakanPDF(data, {
      ...getReportSettings(),
      year,
    });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="unpaid animate-fade-in">
      <UnpaidToolbar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        handlePrintBulkPDF={handlePrintBulkPDF}
      />

      {loading ? (
        <div className="unpaid__loading">
          <Loader2 className="spinner" size={48} />
          <p>Mengambil data dari server...</p>
        </div>
      ) : (
        <div className="unpaid__grid mt-6">
          {data.length > 0 ? (
            data.map((item) => (
              <UnpaidCard
                key={item.id}
                item={item}
                expandedId={expandedId}
                toggleExpand={toggleExpand}
                categories={categories}
                categoryPrefix={categoryPrefix}
                setCategoryPrefix={setCategoryPrefix}
                year={year}
                setYear={setYear}
                availableYears={availableYears}
                handleSendSingleWA={handleSendSingleWA}
                handleSendWA={handleSendWA}
                handlePrintPDF={handlePrintPDF}
              />
            ))
          ) : (
            <div className="unpaid__empty card card--padded">
              <AlertCircle size={48} className="text-tertiary mb-4" />
              <h3>Data tidak ditemukan</h3>
              <p className="text-secondary mt-2">
                Coba sesuaikan filter atau kata kunci pencarian Anda.
              </p>
              <Button variant="ghost" onClick={refetch} className="mt-4">
                Refresh Data
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
