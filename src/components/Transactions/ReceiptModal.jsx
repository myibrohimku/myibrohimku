import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Download, CheckCircle, ArrowUpCircle, X, Banknote, CreditCard } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import './ReceiptModal.css';

const formatRupiah = (num) => 'Rp ' + Number(num || 0).toLocaleString('id-ID');

const formatDateStr = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const datePart = d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timePart = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return `${days[d.getDay()]}, ${datePart} • ${timePart}`;
};

const formatIdDateNum = (dateStr) => {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return Number(`${day}${month}${year}`);
};

export default function ReceiptModal({
  isOpen,
  onClose,
  data,
  type, // 'income' | 'outcome'
  masterData
}) {
  const receiptRef = useRef(null);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen || !data) return null;

  const { jenisBayar, kasirList, urgensiList, sumberDanaList } = masterData;

  const getJenisLabel = (id) => jenisBayar?.find(j => j.id === id)?.label || id;
  const getKasirLabel = (id) => kasirList?.find(k => k.id === id)?.label || id;
  const getUrgensiLabel = (id) => urgensiList?.find(u => u.id === id)?.label || id;
  const getSumberLabel = (id, custom) => {
    const found = sumberDanaList?.find(s => s.id === id);
    if (found?.kode === 'lainnya' && custom) return custom;
    return found?.label || id || '-';
  };

  const isIncome = type === 'income';

  // ─── Transaction ID ───
  // Income: NIA * date_number
  // Outcome: DB id * date_number
  let transactionId = '-';
  if (isIncome) {
    const nia = Number(data.databasesantri?.nia) || 0;
    const dateNum = formatIdDateNum(data.created_at);
    transactionId = `#${nia * dateNum}`;
  } else {
    const id = Number(data.id) || 0;
    const dateNum = formatIdDateNum(data.created_at);
    transactionId = `#${id * dateNum}`;
  }

  // ─── Tahun Pelajaran ───
  // Uses tahun_bayar from the record (set in PaymentForm from NominalSettings year)
  const tahunBayar = data.tahun_bayar || new Date(data.created_at).getFullYear();
  const tahunPelajaranStr = `${tahunBayar}/${tahunBayar + 1}`;

  // ─── Kategori (Income only) ───
  const kategori = (() => {
    if (!isIncome) return '';
    if (data.details && data.details.length > 1) return `Multi Pembayaran (${tahunBayar})`;
    return `${getJenisLabel(data.jenis_bayar)} (${tahunBayar})`;
  })();

  // ─── Sumber Dana Utama (Outcome only) ───
  const sumberDanaUtama = (() => {
    if (isIncome) return '';
    const sources = data.sumber_dana || [];
    if (sources.length === 0) return '-';
    // The first source with the highest nominal is the "main" one
    const sorted = [...sources].sort((a, b) => b.nominal - a.nominal);
    return getJenisLabel(sorted[0].jenis);
  })();

  // ─── PDF Download ───
  const handleDownloadPdf = async () => {
    if (!receiptRef.current) return;
    setIsDownloading(true);

    try {
      const targetElement = receiptRef.current;
      const originalHeight = targetElement.style.height;
      const originalOverflow = targetElement.style.overflow;
      const originalMaxH = targetElement.style.maxHeight;

      targetElement.style.height = 'max-content';
      targetElement.style.maxHeight = 'none';
      targetElement.style.overflow = 'visible';
      targetElement.style.aspectRatio = 'auto';

      const detailsEl = targetElement.querySelector('.receipt__details');
      const originalDetailsOverflow = detailsEl ? detailsEl.style.overflow : '';
      const originalDetailsHeight = detailsEl ? detailsEl.style.height : '';
      if (detailsEl) {
        detailsEl.style.overflow = 'visible';
        detailsEl.style.height = 'auto';
      }

      const canvas = await html2canvas(targetElement, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });

      targetElement.style.height = originalHeight;
      targetElement.style.maxHeight = originalMaxH;
      targetElement.style.overflow = originalOverflow;
      targetElement.style.aspectRatio = '';
      if (detailsEl) {
        detailsEl.style.overflow = originalDetailsOverflow;
        detailsEl.style.height = originalDetailsHeight;
      }

      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height],
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);

      // Format tanggal DDMMYYYY dari created_at
      const pdfDate = (() => {
        const d = new Date(data.created_at);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}${mm}${yyyy}`;
      })();

      let pdfFilename = '';
      if (isIncome) {
        const nama = data.databasesantri?.nama || 'Tanpa Nama';
        pdfFilename = `BUKTI PEMBAYARAN ${nama.toUpperCase()}_${pdfDate}.pdf`;
      } else {
        pdfFilename = `BUKTI PENGELUARAN_${pdfDate}.pdf`;
      }

      pdf.save(pdfFilename);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Gagal membuat PDF.');
    } finally {
      setIsDownloading(false);
    }
  };

  // ─── PNG Download ───
  const handleDownloadPng = async () => {
    if (!receiptRef.current) return;
    setIsDownloading(true);

    try {
      const targetElement = receiptRef.current;
      const originalHeight = targetElement.style.height;
      const originalOverflow = targetElement.style.overflow;
      const originalMaxH = targetElement.style.maxHeight;

      targetElement.style.height = 'max-content';
      targetElement.style.maxHeight = 'none';
      targetElement.style.overflow = 'visible';
      targetElement.style.aspectRatio = 'auto';

      const detailsEl = targetElement.querySelector('.receipt__details');
      const originalDetailsOverflow = detailsEl ? detailsEl.style.overflow : '';
      const originalDetailsHeight = detailsEl ? detailsEl.style.height : '';
      if (detailsEl) {
        detailsEl.style.overflow = 'visible';
        detailsEl.style.height = 'auto';
      }

      const canvas = await html2canvas(targetElement, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });

      targetElement.style.height = originalHeight;
      targetElement.style.maxHeight = originalMaxH;
      targetElement.style.overflow = originalOverflow;
      targetElement.style.aspectRatio = '';
      if (detailsEl) {
        detailsEl.style.overflow = originalDetailsOverflow;
        detailsEl.style.height = originalDetailsHeight;
      }

      const imgData = canvas.toDataURL('image/png');

      // Format tanggal DDMMYYYY dari created_at
      const fileDate = (() => {
        const d = new Date(data.created_at);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}${mm}${yyyy}`;
      })();

      let filename = '';
      if (isIncome) {
        const nama = data.databasesantri?.nama || 'Tanpa Nama';
        filename = `BUKTI PEMBAYARAN ${nama.toUpperCase()}_${fileDate}.png`;
      } else {
        filename = `BUKTI PENGELUARAN_${fileDate}.png`;
      }

      const link = document.createElement('a');
      link.href = imgData;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error generating PNG:', error);
      alert('Gagal membuat PNG.');
    } finally {
      setIsDownloading(false);
    }
  };

  // ─── Render ───
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      maxWidth="440px"
      bodyClassName="modal-body--no-padding receipt-modal__container"
    >
      <button className="receipt-modal__close-btn" onClick={onClose} title="Tutup">
        <X size={22} />
      </button>

      <div className={`receipt-modal__content ${isIncome ? 'receipt--income' : 'receipt--outcome'}`} ref={receiptRef}>
        {/* Watermark pattern */}
        <div className="receipt__watermark-grid" aria-hidden="true">
          {Array.from({ length: 12 }).map((_, i) => (
            <span key={i} className="receipt__watermark-text">MyIbrohimku</span>
          ))}
        </div>

        {/* ──── HEADER ──── */}
        <div className="receipt__header">
          <h1 className="receipt__h1">
            {isIncome ? 'BUKTI PEMBAYARAN' : 'BUKTI PENGELUARAN'}
          </h1>
          <p className="receipt__subtitle">
            Asrama Sayyid Ibrohim
          </p>
        </div>

        {/* ──── STATUS ──── */}
        <div className="receipt__status">
          <h2 className="receipt__status-title">
            {isIncome ? 'Transaksi Berhasil' : 'Pengambilan Berhasil'}
          </h2>
          <p className="receipt__date">{formatDateStr(data.created_at)}</p>
          <div className="receipt__status-icon">
            {isIncome
              ? <CheckCircle size={44} strokeWidth={2.2} />
              : <ArrowUpCircle size={44} strokeWidth={2.2} />
            }
          </div>
        </div>

        {/* ──── TOTAL ──── */}
        <div className="receipt__total">
          <span className="receipt__total-label">
            {isIncome ? 'Total Pembayaran' : 'Total Pengeluaran'}
          </span>
          <span className={`receipt__total-amount ${isIncome ? 'receipt__total-amount--green' : ''}`}>
            {formatRupiah(data.nominal)}
          </span>
        </div>

        {/* ──── DIVIDER ──── */}
        <div className="receipt__divider" />

        {/* ──── DETAILS ──── */}
        <div className="receipt__details">
          {/* ID Transaksi */}
          <div className="receipt__row">
            <span className="receipt__row-label">ID Transaksi</span>
            <span className="receipt__row-value receipt__row-value--mono">{transactionId}</span>
          </div>

          {isIncome ? (
            <>
              {/* Pembayar */}
              <div className="receipt__row">
                <span className="receipt__row-label">Pembayar</span>
                <div className="receipt__row-value receipt__row-value--info">
                  <span className="receipt__info-name">{(data.databasesantri?.nama || '-').toUpperCase()}</span>
                  <span className="receipt__info-meta">NIA: {data.databasesantri?.nia || '-'}</span>
                  <span className="receipt__info-meta">Kamar: {data.databasesantri?.ref_kamar?.nama_kamar || '-'}</span>
                </div>
              </div>

              {/* Kategori */}
              <div className="receipt__row">
                <span className="receipt__row-label">Kategori</span>
                <span className="receipt__row-value">{kategori}</span>
              </div>

              {/* Metode Pembayaran */}
              <div className="receipt__row">
                <span className="receipt__row-label">Metode Pembayaran</span>
                <span className="receipt__row-value receipt__row-value--badge">
                  {data.metode_bayar === 'tunai' ? 'Tunai' : 'Transfer'}
                </span>
              </div>

              {/* Sumber Dana (Pemberi) */}
              <div className="receipt__row">
                <span className="receipt__row-label">Diberikan Oleh</span>
                <span className="receipt__row-value receipt__row-value--badge">
                  {getSumberLabel(data.sumber_dana_id, data.sumber_dana_custom)}
                </span>
              </div>

              {/* Rincian Pembayaran */}
              <div className="receipt__section-title">Rincian Pembayaran</div>
              <div className="receipt__breakdown">
                {data.details && data.details.length > 0 ? (
                  data.details.map((d, i) => (
                    <div className="receipt__breakdown-row" key={i}>
                      <span>{getJenisLabel(d.jenis_bayar)} ({tahunBayar})</span>
                      <span>{formatRupiah(d.nominal)}</span>
                    </div>
                  ))
                ) : (
                  <div className="receipt__breakdown-row">
                    <span>{getJenisLabel(data.jenis_bayar)} ({tahunBayar})</span>
                    <span>{formatRupiah(data.nominal)}</span>
                  </div>
                )}
                <div className="receipt__breakdown-divider" />
                <div className="receipt__breakdown-row receipt__breakdown-row--total">
                  <span>Total Pembayaran</span>
                  <span>{formatRupiah(data.nominal)}</span>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Pengambil / Atas Nama */}
              <div className="receipt__row">
                <span className="receipt__row-label">Pengambil/Atas Nama</span>
                <span className="receipt__row-value">{data.pengambil || '-'}</span>
              </div>

              {/* Urgensi */}
              <div className="receipt__row">
                <span className="receipt__row-label">Urgensi</span>
                <span className="receipt__row-value receipt__row-value--badge">{getUrgensiLabel(data.urgensi_id)}</span>
              </div>

              {/* Deskripsi */}
              <div className="receipt__row">
                <span className="receipt__row-label">Deskripsi pengeluaran</span>
                <span className="receipt__row-value">{data.deskripsi || '-'}</span>
              </div>

              {/* Nominal */}
              <div className="receipt__row">
                <span className="receipt__row-label">Nominal</span>
                <span className="receipt__row-value">{formatRupiah(data.nominal)}</span>
              </div>

              {/* Sumber Dana Utama */}
              <div className="receipt__row">
                <span className="receipt__row-label">Sumber dana utama</span>
                <span className="receipt__row-value">{sumberDanaUtama}</span>
              </div>

              {/* Rincian Sumber Dana */}
              <div className="receipt__section-title">Rincian Sumber Dana</div>
              <div className="receipt__breakdown">
                {data.sumber_dana && data.sumber_dana.length > 0 ? (
                  data.sumber_dana.map((s, i) => (
                    <div className="receipt__breakdown-row" key={i}>
                      <span>{getJenisLabel(s.jenis)}</span>
                      <span>{formatRupiah(s.nominal)}</span>
                    </div>
                  ))
                ) : (
                  <div className="receipt__breakdown-row">
                    <span>-</span>
                    <span>Rp 0</span>
                  </div>
                )}
                <div className="receipt__breakdown-divider" />
                <div className="receipt__breakdown-row receipt__breakdown-row--total">
                  <span>Total Pengeluaran</span>
                  <span>{formatRupiah(
                    (data.sumber_dana || []).reduce((sum, s) => sum + (s.nominal || 0), 0)
                  )}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ──── FOOTER ──── */}
        <div className="receipt__footer">
          <div className="receipt__signature">
            <span className="receipt__signature-role">
              {isIncome ? 'Penerima/Kasir' : 'Mengetahui,'}
            </span>
            <div className="receipt__signature-line" />
            <span className="receipt__signature-name">
              {isIncome ? (getKasirLabel(data.kasir_id) || 'Kasir') : 'Bendahara'}
            </span>
          </div>

          <p className="receipt__footer-msg">
            {isIncome
              ? 'Trimakasih Banyak Atas Kerjasamnya Semoga Termasuk Amal yang Berkah bagi kita.'
              : 'Mohon Gunakan Pengeluaran Dengan Bijak!'}
          </p>
        </div>
      </div>

      {/* ──── ACTION BAR ──── */}
      <div className="receipt-modal__actions">
        <Button
          icon={Download}
          onClick={handleDownloadPdf}
          disabled={isDownloading}
          className="receipt-modal__download-btn"
        >
          {isDownloading ? 'Memproses...' : 'Unduh PDF'}
        </Button>
        <Button
          icon={Download}
          onClick={handleDownloadPng}
          disabled={isDownloading}
          className="receipt-modal__download-btn"
          variant="secondary"
        >
          {isDownloading ? 'Memproses...' : 'Unduh PNG'}
        </Button>
      </div>
    </Modal>
  );
}
