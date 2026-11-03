import { useState } from 'react';
import { Download, Save, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { supabase } from '../../lib/supabaseClient';
import { sanitizeString, getCleanFormData } from './santriUtils';
import './SantriUploadModal.css';

// Excel menyimpan tanggal sebagai serial number; konversi ke YYYY-MM-DD agar
// tidak tersimpan sebagai angka mentah ("45000") di kolom date.
const parseDateValue = (val) => {
  if (val === undefined || val === null || val === '') return null;
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    return `${val.getFullYear()}-${String(val.getMonth() + 1).padStart(2, '0')}-${String(val.getDate()).padStart(2, '0')}`;
  }
  if (typeof val === 'number') {
    if (!isFinite(val)) return null;
    const ms = Math.round((val - 25569) * 86400 * 1000);
    const d = new Date(ms);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  }
  return String(val).trim() || null;
};

export default function SantriUploadModal({
  isOpen,
  onClose,
  onSuccess,
  masterData
}) {
  const [uploadDataPreview, setUploadDataPreview] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);

  const {
    kamar: kamarOptions,
    instansi: instansiOptions,
    statusSantri: statusOptions,
    kategori: kategoriOptions,
    statusOrtu: statusOrtuOptions,
    statusBpjs: statusBpjsOptions,
    penghasilan: penghasilanOptions,
    statusSaudara: statusSaudaraOptions
  } = masterData;

  const handleDownloadTemplate = () => {
    const templateHeaders = [
      "nia", "nama", "kamar_id", "keterangan", "status_id", "kategori_id", "instansi_id",
      "nisn", "nik", "tempat_lahir", "tanggal_lahir",
      "desa", "rt_rw", "kecamatan", "kabupaten_kota", "provinsi",
      "koordinat_pribadi", "koordinat_saudara",
      "no_wa_pribadi", "email_pribadi", "status_bpjs_id",
      "nama_ayah", "nama_ibu", "no_wa_wali",
      "pekerjaan_ayah", "pekerjaan_ibu", "status_ortu_id",
      "penghasilan_ayah_id", "penghasilan_ibu_id", "status_saudara_id"
    ];

    const wsData = [templateHeaders];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    const refKamar = kamarOptions.map(k => [k.value, k.label]);
    const refInstansi = instansiOptions.map(i => [i.value, i.label]);
    const refStatus = statusOptions.map(s => [s.value, s.label]);
    const refKategori = kategoriOptions.map(c => [c.value, c.label]);
    const refOrtu = statusOrtuOptions.map(o => [o.value, o.label]);
    const refBpjs = statusBpjsOptions.map(b => [b.value, b.label]);
    const refPenghasilan = penghasilanOptions.map(p => [p.value, p.label]);
    const refStatusSaudara = statusSaudaraOptions.map(ss => [ss.value, ss.label]);

    const refData = [
      ["PENTING: Gunakan angka ID untuk Kamar, Status, Instansi, Kategori, Status Ortu, dan Status BPJS."],
      [""],
      ["--- KAMAR ---", "--- NAMA KAMAR ---"],
      ...refKamar,
      [""],
      ["--- INSTANSI ---", "--- NAMA INSTANSI ---"],
      ...refInstansi,
      [""],
      ["--- STATUS ---", "--- NAMA STATUS ---"],
      ...refStatus,
      [""],
      ["--- KATEGORI ---", "--- NAMA KATEGORI ---"],
      ...refKategori,
      [""],
      ["--- STATUS ORTU ---", "--- LABEL ---"],
      ...refOrtu,
      [""],
      ["--- STATUS BPJS ---", "--- LABEL ---"],
      ...refBpjs,
      [""],
      ["--- PENGHASILAN ---", "--- RENTANG ---"],
      ...refPenghasilan,
      [""],
      ["--- STATUS SAUDARA ---", "--- LABEL ---"],
      ...refStatusSaudara
    ];
    const wsRef = XLSX.utils.aoa_to_sheet(refData);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Data Santri");
    XLSX.utils.book_append_sheet(wb, wsRef, "Referensi ID");

    XLSX.writeFile(wb, "Template_Upload_Santri.xlsx");
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsParsing(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rows = XLSX.utils.sheet_to_json(ws);

        // NIA adalah kunci upsert. Baris tanpa NIA dan NIA ganda harus dibuang
        // agar tidak memicu "ON CONFLICT DO UPDATE affects row a second time".
        const dedupedRows = new Map();
        let skippedWithoutNia = 0;
        let duplicateCount = 0;
        rows.forEach(row => {
          const rowNia = row.nia !== undefined && row.nia !== null ? row.nia.toString().trim() : '';
          if (!rowNia) {
            if (row.nama) skippedWithoutNia++;
            return;
          }
          if (dedupedRows.has(rowNia)) duplicateCount++;
          dedupedRows.set(rowNia, { ...row, nia: rowNia });
        });
        const data = Array.from(dedupedRows.values());

        if (data.length === 0) {
          alert('File tidak berisi baris dengan NIA yang valid.');
          return;
        }
        if (skippedWithoutNia > 0 || duplicateCount > 0) {
          alert(
            `${skippedWithoutNia > 0 ? `${skippedWithoutNia} baris tanpa NIA dilewati. ` : ''}` +
            `${duplicateCount > 0 ? `${duplicateCount} NIA ganda digabung (baris terakhir dipakai).` : ''}`
          );
        }

        // Fetch existing data for merging
        const nias = data.map(r => r.nia?.toString().trim()).filter(Boolean);
        const existingMap = new Map();
        
        if (nias.length > 0) {
            const chunkSize = 500;
            for (let i = 0; i < nias.length; i += chunkSize) {
                const chunk = nias.slice(i, i + chunkSize);
                const { data: existingData } = await supabase
                    .from('databasesantri')
                    .select('*')
                    .in('nia', chunk);
                if (existingData) {
                    existingData.forEach(item => existingMap.set(item.nia?.toString().trim(), item));
                }
            }
        }

        const sanitizedData = data
          .filter(row => row.nia || row.nama)
          .map(row => {
            const rowNia = row.nia?.toString().trim() || '';
            const existing = existingMap.get(rowNia) || {};
            
            const getValue = (excelVal, existingVal, defaultVal) => {
                if (excelVal !== undefined && excelVal !== null && excelVal !== '') return excelVal;
                if (existingVal !== undefined && existingVal !== null) return existingVal;
                return defaultVal;
            };

            const rowData = {
              nia: rowNia,
              nama: sanitizeString(row.nama) || existing.nama || '',
              nisn: getValue(row.nisn?.toString().trim(), existing.nisn, null),
              nik: getValue(row.nik?.toString().trim(), existing.nik, null),
              tempat_lahir: sanitizeString(row.tempat_lahir) || existing.tempat_lahir || '',
              tanggal_lahir: getValue(parseDateValue(row.tanggal_lahir), existing.tanggal_lahir, null),
              kamar_id: row.kamar_id ? parseInt(row.kamar_id) : (existing.kamar_id || null),
              status_id: row.status_id ? parseInt(row.status_id) : (existing.status_id || null),
              kategori: (row.kategori_id || row.kategori) ? parseInt(row.kategori_id || row.kategori) : (existing.kategori || null),
              instansi_id: row.instansi_id ? parseInt(row.instansi_id) : (existing.instansi_id || null),
              desa: sanitizeString(row.desa) || existing.desa || '',
              rt_rw: getValue(row.rt_rw?.toString().trim(), existing.rt_rw, ''),
              kecamatan: sanitizeString(row.kecamatan) || existing.kecamatan || '',
              kabupaten_kota: sanitizeString(row.kabupaten_kota) || existing.kabupaten_kota || '',
              provinsi: sanitizeString(row.provinsi) || existing.provinsi || '',
              keterangan: getValue(row.keterangan, existing.keterangan, ''),
              koordinat_pribadi: getValue(row.koordinat_pribadi, existing.koordinat_pribadi, ''),
              koordinat_saudara: getValue(row.koordinat_saudara, existing.koordinat_saudara, ''),
              no_wa_pribadi: getValue(row.no_wa_pribadi?.toString().trim(), existing.no_wa_pribadi, ''),
              email_pribadi: getValue(row.email_pribadi?.toString().trim(), existing.email_pribadi, ''),
              status_bpjs_id: row.status_bpjs_id ? parseInt(row.status_bpjs_id) : (existing.status_bpjs_id || null),
              nama_ayah: sanitizeString(row.nama_ayah) || existing.nama_ayah || '',
              nama_ibu: sanitizeString(row.nama_ibu) || existing.nama_ibu || '',
              pekerjaan_ayah: sanitizeString(row.pekerjaan_ayah) || existing.pekerjaan_ayah || '',
              pekerjaan_ibu: sanitizeString(row.pekerjaan_ibu) || existing.pekerjaan_ibu || '',
              status_ortu_id: row.status_ortu_id ? parseInt(row.status_ortu_id) : (existing.status_ortu_id || null),
              penghasilan_ayah_id: row.penghasilan_ayah_id ? parseInt(row.penghasilan_ayah_id) : (existing.penghasilan_ayah_id || null),
              penghasilan_ibu_id: row.penghasilan_ibu_id ? parseInt(row.penghasilan_ibu_id) : (existing.penghasilan_ibu_id || null),
              keberadaan_ayah_id: row.keberadaan_ayah_id ? parseInt(row.keberadaan_ayah_id) : (existing.keberadaan_ayah_id || null),
              keberadaan_ibu_id: row.keberadaan_ibu_id ? parseInt(row.keberadaan_ibu_id) : (existing.keberadaan_ibu_id || null),
              status_saudara_id: row.status_saudara_id ? parseInt(row.status_saudara_id) : (existing.status_saudara_id || null),
              no_wa_wali: getValue(row.no_wa_wali?.toString().trim(), existing.no_wa_wali, '')
            };
            
            const cleanData = getCleanFormData(rowData);
            if (existing.id) {
                cleanData.id = existing.id;
            }
            return cleanData;
          });

        setUploadDataPreview(sanitizedData);
      } catch {
        alert("Gagal membaca file Excel. Pastikan formatnya sesuai template.");
      } finally {
        setIsParsing(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const getLabelById = (options, id) => {
    if (!id || !options) return '-';
    const found = options.find(opt => opt.value === id || opt.value === parseInt(id));
    return found ? found.label : `ID ${id} (Tak Dikenal)`;
  };

  const handleBulkSubmit = async () => {
    if (uploadDataPreview.length === 0) return;
    try {
      setUploading(true);
      const CHUNK_SIZE = 500;
      for (let i = 0; i < uploadDataPreview.length; i += CHUNK_SIZE) {
        const chunk = uploadDataPreview.slice(i, i + CHUNK_SIZE);
        const { error } = await supabase
          .from('databasesantri')
          .upsert(chunk, { onConflict: 'nia' });
        if (error) throw error;
      }
      alert(`Berhasil memproses ${uploadDataPreview.length} data santri (Update/Tambah)!`);
      onSuccess();
      setUploadDataPreview([]);
      onClose();
    } catch (err) {
      alert('Gagal mengunggah data: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setUploadDataPreview([]);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Upload Data Santri" maxWidth="850px">
      <div className="modal-content-wrapper animate-fade-in-up">
        <div className="instruction-card">
          <h4 className="instruction-title">Langkah-langkah:</h4>
          <ul className="instruction-list">
            <li>Unduh Template Excel menggunakan tombol di bawah.</li>
            <li>Isi data santri pada file tersebut. Pastikan ID Relasi diisi dengan <b>ANGKA ID</b> yang benar.</li>
            <li>Pilih file yang sudah diisi, lalu periksa preview datanya.</li>
            <li>Klik "Simpan" untuk mengunggah semuanya ke database secara otomatis.</li>
          </ul>
        </div>

        <div className="upload-zone">
          <Button variant="outline" icon={Download} onClick={handleDownloadTemplate}>Unduh Template</Button>
          <div className="upload-input-wrapper">
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={(e) => {
                handleFileUpload(e);
                e.target.value = '';
              }}
              className="file-input-custom"
              disabled={isParsing}
            />
            {isParsing && <span className="parsing-indicator">Membaca file & mencocokkan data...</span>}
          </div>
        </div>

        {uploadDataPreview.length > 0 && (
          <div className="preview-container">
            <div className="preview-header">
              <h4 className="font-semibold">Preview Data ({uploadDataPreview.length} baris)</h4>
              <Badge variant="success">File Terbaca</Badge>
            </div>
            <div className="preview-table-wrapper">
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>NIA</th>
                    <th>NAMA</th>
                    <th>KAMAR</th>
                    <th>KET</th>
                    <th>STATUS</th>
                    <th>KATEGORI</th>
                    <th>INSTANSI</th>
                    <th>PGH. AYAH</th>
                    <th>PGH. IBU</th>
                    <th>S. SAUDARA</th>
                    <th>S. ORTU</th>
                  </tr>
                </thead>
                <tbody>
                  {uploadDataPreview.slice(0, 10).map((row, idx) => (
                    <tr key={idx}>
                      <td>{row.nia}</td>
                      <td className="font-medium">{row.nama}</td>
                      <td>{getLabelById(kamarOptions, row.kamar_id)}</td>
                      <td>{row.keterangan || '-'}</td>
                      <td>{getLabelById(statusOptions, row.status_id)}</td>
                      <td>{getLabelById(kategoriOptions, row.kategori)}</td>
                      <td>{getLabelById(instansiOptions, row.instansi_id)}</td>
                      <td>{getLabelById(penghasilanOptions, row.penghasilan_ayah_id)}</td>
                      <td>{getLabelById(penghasilanOptions, row.penghasilan_ibu_id)}</td>
                      <td>{getLabelById(statusSaudaraOptions, row.status_saudara_id)}</td>
                      <td>{getLabelById(statusOrtuOptions, row.status_ortu_id)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {uploadDataPreview.length > 10 && (
              <div style={{ padding: '12px', textAlign: 'center', background: 'var(--surface-secondary)', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                Menampilkan 10 baris pertama dari total {uploadDataPreview.length} data.
              </div>
            )}
          </div>
        )}

        <div className="form-footer">
          <Button type="button" variant="ghost" icon={X} onClick={handleClose}>Batal</Button>
          <Button type="button" variant="primary" icon={Save} onClick={handleBulkSubmit} disabled={uploadDataPreview.length === 0 || uploading} className="flex-1">
            {uploading ? 'Sedang Mengunggah...' : 'Simpan Data'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
