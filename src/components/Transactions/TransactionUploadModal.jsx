import { useState } from 'react';
import { Download, Upload, Save, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { supabase } from '../../lib/supabaseClient';
import { useApp } from '../../context/AppContext';
import './TransactionUploadModal.css';

export default function TransactionUploadModal({
  isOpen,
  onClose,
  onSuccess,
  type = 'income', // 'income' | 'outcome'
  masterData
}) {
  const { addToast } = useApp();
  const [uploadDataPreview, setUploadDataPreview] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [errorLogs, setErrorLogs] = useState([]);

  const isIncome = type === 'income';

  const handleClose = () => {
    setUploadDataPreview([]);
    setErrorLogs([]);
    onClose();
  };

  const handleDownloadTemplate = () => {
    const templateHeaders = isIncome 
      ? ["nia", "jenis_bayar_id", "nominal", "tanggal", "sumber_dana_id", "metode_bayar", "kasir_id", "keterangan"]
      : ["pengambil", "deskripsi", "nominal", "tanggal", "urgensi_id", "sumber_dana"];

    const wsData = [templateHeaders];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");

    // Add reference sheet if needed
    const refData = [
      ["PENTING: Gunakan kode/ID yang tertera di sheet referensi ini."],
      ["metode_bayar: 'tunai' atau 'transfer'"],
      ["sumber_dana (outcome): format 'kode:nominal;kode:nominal' (contoh: 'ld01:50000;ks01:20000')"],
      [""]
    ];

    if (isIncome) {
      refData.push(["--- JENIS BAYAR ---", "--- NAMA ---"]);
      masterData.jenisBayar?.forEach(j => refData.push([j.id, j.label]));
      refData.push([""], ["--- SUMBER DANA ---", "--- NAMA ---"]);
      masterData.sumberDanaList?.forEach(s => refData.push([s.id, s.label]));
      refData.push([""], ["--- KASIR ---", "--- NAMA ---"]);
      masterData.kasirList?.forEach(k => refData.push([k.id, k.label]));
    } else {
      refData.push(["--- URGENSI ---", "--- LABEL ---"]);
      masterData.urgensiList?.forEach(u => refData.push([u.id, u.label]));
      refData.push([""], ["--- SUMBER DANA (KODE : NAMA) ---", "--- LABEL ---"]);
      masterData.sumberDanaList?.forEach(s => refData.push([s.kode, s.label]));
    }

    const wsRef = XLSX.utils.aoa_to_sheet(refData);
    XLSX.utils.book_append_sheet(wb, wsRef, "Referensi ID");

    XLSX.writeFile(wb, `Template_Upload_${isIncome ? 'Pemasukan' : 'Pengeluaran'}.xlsx`);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadDataPreview([]);
    setErrorLogs([]);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        // Normalize semua key kolom ke lowercase + trim untuk menghindari mismatch "NIA" vs "nia"
        const rawData = XLSX.utils.sheet_to_json(ws);
        const data = rawData
          .map(row => {
            const normalized = {};
            Object.entries(row).forEach(([k, v]) => {
              normalized[k.trim().toLowerCase()] = v;
            });
            return normalized;
          })
          // Buang baris kosong (tidak punya field apapun yang berisi nilai)
          .filter(row => Object.values(row).some(v => v !== '' && v !== null && v !== undefined));

          const parseExcelDate = (excelDate) => {
            if (!excelDate) return new Date();
            if (typeof excelDate === 'number') {
              return new Date(Math.round((excelDate - 25569) * 86400 * 1000));
            }
            if (typeof excelDate === 'string') {
              // Hilangkan tanda kutip tunggal di awal jika ada (format text excel)
              const cleanStr = excelDate.trim().replace(/^'/, '');
              // Regex membaca [tanggal/bulan/tahun jam:menit:detik]
              const regex = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/;
              const match = cleanStr.match(regex);
              if (match) {
                const day = parseInt(match[1], 10);
                const month = parseInt(match[2], 10) - 1; // 0-indexed bulan
                const year = parseInt(match[3], 10);
                const hour = match[4] ? parseInt(match[4], 10) : 0;
                const min = match[5] ? parseInt(match[5], 10) : 0;
                const sec = match[6] ? parseInt(match[6], 10) : 0;
                return new Date(year, month, day, hour, min, sec);
              }
              const d = new Date(cleanStr);
              return isNaN(d.getTime()) ? new Date() : d;
            }
            return new Date();
          };

        if (isIncome) {
          // Resolve NIA to santri_id
          setUploading(true);
          const nias = [...new Set(data.map(d => d.nia?.toString().trim()).filter(Boolean))];
          let santris = [];
          if (nias.length > 0) {
            const { data: santrisData } = await supabase
              .from('databasesantri')
              .select('id, nia, nama')
              .in('nia', nias);
            santris = santrisData || [];
          }
          
          const niaMap = new Map(santris.map(s => [s.nia?.toString().trim(), s]));
          const logs = [];

          const sanitized = data.map((row, idx) => {
            const santriStr = row.nia?.toString().trim();
            const santri = santriStr ? niaMap.get(santriStr) : null;
            if (!santri) logs.push(`Baris ${idx + 2}: NIA ${row.nia} tidak ditemukan.`);

            const nominalValue = parseFloat(row.nominal) || 0;
            const jenisBayar = row.jenis_bayar_id?.toString().trim() || null;
            const kasirId = row.kasir_id?.toString().trim() || null;
            if (!jenisBayar) logs.push(`Baris ${idx + 2}: jenis_bayar_id wajib diisi.`);
            if (!kasirId) logs.push(`Baris ${idx + 2}: kasir_id wajib diisi.`);
            if (nominalValue <= 0) logs.push(`Baris ${idx + 2}: nominal harus lebih dari 0.`);

            const sumberDanaId = row.sumber_dana_id === undefined || row.sumber_dana_id === null || row.sumber_dana_id === ''
              ? null
              : parseInt(row.sumber_dana_id, 10);

            const rowDate = parseExcelDate(row.tanggal);

            return {
              santri_id: santri?.id || null,
              _santri_nama: santri?.nama || 'TIDAK DITEMUKAN',
              _nia: row.nia,
              jenis_bayar: jenisBayar,
              nominal: nominalValue,
              created_at: rowDate.toISOString(),
              sumber_dana_id: Number.isFinite(sumberDanaId) ? sumberDanaId : null,
              metode_bayar: row.metode_bayar?.toString().toLowerCase() === 'transfer' ? 'transfer' : 'tunai',
              kasir_id: kasirId,
              sumber_dana_custom: row.keterangan ? String(row.keterangan) : null,
              tahun_bayar: rowDate.getFullYear()
            };
          });
          
          setUploadDataPreview(sanitized);
          setErrorLogs(logs);
          setUploading(false);
        } else {
          // Outcome logic
          const logs = [];
          const sanitized = data.map((row, idx) => {
            // Parse sumber_dana format 'id:nominal;id:nominal'
            let sources = [];
            if (row.sumber_dana) {
              const rawStr = String(row.sumber_dana).trim();
              if (rawStr) {
                if (rawStr.includes(':')) {
                  // Format kompleks: id:nominal;id:nominal
                  sources = rawStr.split(';').map(s => {
                    const [id, nom] = s.split(':');
                    return { jenis: id ? id.trim() : '', nominal: parseFloat(nom) || 0 };
                  }).filter(s => s.jenis !== '');
                } else {
                  // Format sederhana: hanya kode sumber dana (misal: "ld01")
                  sources = [{ jenis: rawStr, nominal: parseFloat(row.nominal) || 0 }];
                }
              }
            }

            const nominalValue = parseFloat(row.nominal) || 0;
            if (!row.pengambil || !String(row.pengambil).trim()) logs.push(`Baris ${idx + 2}: pengambil wajib diisi.`);
            if (!row.urgensi_id) logs.push(`Baris ${idx + 2}: urgensi_id wajib diisi.`);
            if (nominalValue <= 0) logs.push(`Baris ${idx + 2}: nominal harus lebih dari 0.`);
            if (sources.length === 0) logs.push(`Baris ${idx + 2}: sumber_dana wajib diisi.`);

            const rowDate = parseExcelDate(row.tanggal);

            return {
              pengambil: row.pengambil ? String(row.pengambil).trim() : '',
              deskripsi: row.deskripsi ? String(row.deskripsi) : '',
              nominal: nominalValue,
              created_at: rowDate.toISOString(),
              urgensi_id: row.urgensi_id?.toString().trim() || null,
              sumber_dana: sources,
              _dateKey: rowDate.toISOString().split('T')[0] // For duplicate matching
            };
          });
          setUploadDataPreview(sanitized);
          setErrorLogs(logs);
        }
      } catch {
        addToast("Gagal membaca file Excel. Pastikan formatnya sesuai template.", "error");
      } finally {
        setUploading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleBulkSubmit = async () => {
    if (uploadDataPreview.length === 0) return;
    
    // Check for errors in income
    if (isIncome && uploadDataPreview.some(d => !d.santri_id)) {
      addToast("Ada data dengan NIA yang tidak valid. Harap perbaiki file Anda.", "error");
      return;
    }

    try {
      setUploading(true);
      const table = isIncome ? 'transaksi_pemasukan' : 'transaksi_pengeluaran';
      
      let finalDataToSave = [];
      let updatedCount = 0;
      let insertedCount = 0;

      if (isIncome) {
        // Kunci unik mengikuti constraint DB (santri_id, jenis_bayar, tahun_bayar).
        // Tanggal tidak boleh ikut menjadi kunci, jika tidak dua baris dengan tanggal
        // berbeda akan lolos dedupe lalu gagal saat insert/upsert.
        const buildIncomeKey = (row) =>
          `${row.santri_id}-${String(row.jenis_bayar).toLowerCase()}-${row.tahun_bayar}`;

        // Deduplicate internal array to prevent constraint violation on identical rows
        const aggregatedIncome = new Map();
        uploadDataPreview.forEach(row => {
          const key = buildIncomeKey(row);
          if (aggregatedIncome.has(key)) {
            const existing = aggregatedIncome.get(key);
            existing.nominal += row.nominal;
          } else {
            aggregatedIncome.set(key, { ...row });
          }
        });
        
        const deduplicatedUploadData = Array.from(aggregatedIncome.values());

        // Fetch existing records to check for duplicates to update
        const santriIds = [...new Set(deduplicatedUploadData.map(d => d.santri_id))].filter(Boolean);
        const years = [...new Set(deduplicatedUploadData.map(d => d.tahun_bayar))].filter(y => y && !isNaN(y));

        let existingMap = new Map();
        if (santriIds.length > 0 && years.length > 0) {
          // Chunk querying to avoid Supabase 1000 limit
          const chunkSize = 200;
          for (let i = 0; i < santriIds.length; i += chunkSize) {
            const chunkSantriIds = santriIds.slice(i, i + chunkSize);
            const { data: existing, error: existingError } = await supabase
              .from('transaksi_pemasukan')
              .select('id, santri_id, jenis_bayar, tahun_bayar, created_at')
              .in('santri_id', chunkSantriIds)
              .in('tahun_bayar', years);

            if (existingError) throw existingError;

            if (existing) {
              existing.forEach(e => {
                existingMap.set(buildIncomeKey(e), e.id);
              });
            }
          }
        }

        deduplicatedUploadData.forEach(row => {
          const key = buildIncomeKey(row);
          const rest = { ...row };
          delete rest._santri_nama;
          delete rest._nia;
          if (existingMap.has(key)) {
            // Include existing ID to perform an update (Paste and Replace)
            finalDataToSave.push({ ...rest, id: existingMap.get(key) });
            updatedCount++;
          } else {
            finalDataToSave.push(rest);
            insertedCount++;
          }
        });
      } else {
        // Outcome logic — Paste and Replace duplicate checking
        const pengambilList = [...new Set(uploadDataPreview.map(d => d.pengambil))].filter(Boolean);
        
        let existingOutMap = new Map();
        if (pengambilList.length > 0) {
          const { data: existingOut, error: fetchOutError } = await supabase
            .from('transaksi_pengeluaran')
            .select('id, pengambil, deskripsi, created_at')
            .in('pengambil', pengambilList);

          if (fetchOutError) throw fetchOutError;

          existingOutMap = new Map(existingOut?.map(e => {
              const datePart = new Date(e.created_at).toISOString().split('T')[0];
              return [`${e.pengambil}-${e.deskripsi || ''}-${datePart}`, e.id];
          }) || []);
        }

        uploadDataPreview.forEach(row => {
          const key = `${row.pengambil}-${row.deskripsi}-${row._dateKey}`;
          const rest = { ...row };
          delete rest._dateKey;
          if (existingOutMap.has(key)) {
             finalDataToSave.push({ ...rest, id: existingOutMap.get(key) });
             updatedCount++;
          } else {
             finalDataToSave.push(rest);
             insertedCount++;
          }
        });
      }

      if (finalDataToSave.length === 0) {
        setUploading(false);
        addToast('Tidak ada data yang valid untuk diimpor.', 'error');
        return;
      }

      // Pisahkan data baru (tanpa id) dan data update (dengan id)
      const toInsert = finalDataToSave.filter(d => !d.id);
      const toUpdate = finalDataToSave.filter(d => !!d.id);

      if (toInsert.length > 0) {
        const { error: insertError } = await supabase.from(table).insert(toInsert);
        if (insertError) throw insertError;
      }

      if (toUpdate.length > 0) {
        // Update satu per satu berdasarkan id
        for (const row of toUpdate) {
          const { id, ...fields } = row;
          const { error: updateError } = await supabase.from(table).update(fields).eq('id', id);
          if (updateError) throw updateError;
        }
      }

      addToast(`Berhasil! ${insertedCount} data baru ditambahkan, ${updatedCount} data diperbarui.`, 'success');
      onSuccess();
      handleClose();
    } catch (err) {
      addToast('Gagal menyimpan ke database: ' + err.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Import ${isIncome ? 'Pemasukan' : 'Pengeluaran'}`} maxWidth="850px">
      <div className="transaction-upload">
        <div className="maintenance-warning">
           <Download size={18} className="warning-icon" />
           <p>Gunakan template yang disediakan untuk menghindari kesalahan format data.</p>
        </div>

        <div className="upload-actions">
           <Button variant="outline" icon={Download} onClick={handleDownloadTemplate}>Unduh Template Excel</Button>
           <div className="file-input-wrapper">
              <Button variant="primary" icon={Upload}>Pilih File Excel</Button>
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={(e) => {
                  handleFileUpload(e);
                  e.target.value = '';
                }}
              />
           </div>
        </div>

        {errorLogs.length > 0 && (
          <div className="error-logs">
            <h5 className="flex items-center gap-2 text-red-500 mb-2"><AlertCircle size={16} /> Kesalahan Ditemukan:</h5>
            <ul>
              {errorLogs.map((log, i) => <li key={i}>{log}</li>)}
            </ul>
          </div>
        )}

        {uploadDataPreview.length > 0 && (
          <div className="upload-preview">
            <h4 className="preview-title">Preview Data ({uploadDataPreview.length} baris)</h4>
            <div className="preview-table-container">
              <table className="preview-table">
                <thead>
                  {isIncome ? (
                    <tr>
                      <th>NIA</th>
                      <th>Nama Santri</th>
                      <th>Nominal</th>
                      <th>Metode</th>
                      <th>Keterangan</th>
                    </tr>
                  ) : (
                    <tr>
                      <th>Pengambil</th>
                      <th>Deskripsi</th>
                      <th>Nominal</th>
                      <th>Urgensi</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {uploadDataPreview.slice(0, 10).map((row, i) => (
                    <tr key={i} className={isIncome && !row.santri_id ? 'row-error' : ''}>
                      {isIncome ? (
                        <>
                          <td>{row._nia}</td>
                          <td>{row._santri_nama}</td>
                          <td>Rp {row.nominal?.toLocaleString()}</td>
                          <td><Badge>{row.metode_bayar}</Badge></td>
                          <td>{row.sumber_dana_custom}</td>
                        </>
                      ) : (
                        <>
                          <td>{row.pengambil}</td>
                          <td>{row.deskripsi}</td>
                          <td>Rp {row.nominal?.toLocaleString()}</td>
                          <td><Badge>{row.urgensi_id}</Badge></td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="modal-footer" style={{ marginTop: 'var(--sp-6)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--sp-3)' }}>
           <Button variant="ghost" onClick={handleClose}>Batal</Button>
           <Button 
             variant="primary" 
             icon={Save} 
             disabled={uploadDataPreview.length === 0 || uploading || errorLogs.length > 0} 
             onClick={handleBulkSubmit}
           >
             {uploading ? 'Memproses...' : 'Simpan ke Database'}
           </Button>
        </div>
      </div>
    </Modal>
  );
}
