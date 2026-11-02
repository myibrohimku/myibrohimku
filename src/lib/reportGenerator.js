import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

/**
 * Helper to get readable value for export
 */
const getExportValue = (item, col, settings = {}) => {
  const val = item[col.key];
  
  // 1. Direct Relational Data (from Supabase Join)
  if (col.key === 'kamar') return item.ref_kamar?.nama_kamar || val || '-';
  if (col.key === 'status') return item.ref_status_santri?.nama_status || val || '-';
  if (col.key === 'instansi_pendidikan') return item.ref_instansi?.nama_instansi || val || '-';
  if (col.key === 'kategori') {
    const kLabel = settings.masterData?.kategori?.find(opt => opt.value === val || opt.value === parseInt(val))?.label;
    return kLabel || item.ref_kategori?.nama_kategori || item.rel_kategori?.nama_kategori || val || '-';
  }
  if (col.key === 'status_kis_bpjs') return item.rel_bpjs?.nama_status || val || '-';
  if (col.key === 'status_orangtua') return item.rel_ortu?.nama_status || val || '-';
  if (col.key === 'penghasilan_ayah') return item.rel_pgh_ayah?.rentang_penghasilan || val || '-';
  if (col.key === 'penghasilan_ibu') return item.rel_pgh_ibu?.rentang_penghasilan || val || '-';
  if (col.key === 'status_saudara') return item.rel_status_saudara?.nama_status || val || '-';
  
  // 2. Format dates
  if (col.key === 'tanggal_lahir' && val) {
    try {
      const d = new Date(val);
      return isNaN(d.getTime()) ? val : d.toLocaleDateString('id-ID');
    } catch (e) {
      return val;
    }
  }

  // 3. Fallback to string representation
  if (typeof val === 'object' && val !== null) return '-';
  return val || '-';
};

/**
 * Generate PDF Report
 * @param {Array} data - Filtered data to export
 * @param {Array} columns - Visible columns configuration
 * @param {Object} settings - Report settings (Kop Surat, etc)
 */
export const generatePDF = (data, columns, settings = {}) => {
  // F4 Size: 210 x 330 mm
  const f4Width = 210;
  const f4Height = 330;

  // Calculate if we need Landscape based on column count
  const isLandscape = columns.length > 7;
  const orientation = isLandscape ? 'l' : 'p';
  const pageWidth = isLandscape ? f4Height : f4Width;
  const pageHeight = isLandscape ? f4Width : f4Height;

  const doc = new jsPDF({
    orientation: orientation,
    unit: 'mm',
    format: [f4Width, f4Height]
  });

  const margin = 15;
  let currentY = 15;

  // 1. Draw Kop Surat
  if (settings.logo) {
    try {
        doc.addImage(settings.logo, 'PNG', margin, currentY, 25, 25);
    } catch (e) {
        console.error("Error adding logo to PDF", e);
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  const title = settings.namaInstansi || 'YAYASAN RUBATH AL KAHFI (YAKFI) SOMALANGU';
  doc.text(title, pageWidth / 2 + 10, currentY + 10, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const address = settings.alamatInstansi || 'Sekretariat : Komplek Doktren Al Kahfi Somalangu Po Box 32 Kebumen 54317 Jawa Tengah';
  doc.text(address, pageWidth / 2 + 10, currentY + 18, { align: 'center' });

  // Border line below Kop
  currentY += 30;
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  doc.setLineWidth(0.2);
  doc.line(margin, currentY + 1, pageWidth - margin, currentY + 1);

  currentY += 10;
  
  // 2. Report Title
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('LAPORAN DATA SANTRI', pageWidth / 2, currentY, { align: 'center' });
  currentY += 10;

  // 3. Table
  const tableHeaders = columns.map(col => col.label);
  const tableData = data.map((item, index) => {
    return columns.map(col => {
      if (col.key === 'row_number') return index + 1;
      return getExportValue(item, col, settings);
    });
  });

  autoTable(doc, {
    startY: currentY,
    head: [tableHeaders],
    body: tableData,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: { fillColor: [40, 40, 40], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: isLandscape ? 7 : 8, cellPadding: 2 },
    didDrawPage: (data) => {
      const str = "Halaman " + doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.text(str, pageWidth - margin - 20, pageHeight - 10);
    }
  });

  // 4. Signature Area
  const finalY = doc.lastAutoTable.finalY + 20;
  const signatureWidth = 60;
  const signatureX = pageWidth - margin - signatureWidth;

  if (finalY + 40 < pageHeight) { 
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const dateStr = `Kebumen, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;
    doc.text(dateStr, signatureX + signatureWidth/2, finalY, { align: 'center' });
    
    doc.text(settings.jabatanAdmin || 'Sekretaris', signatureX + signatureWidth/2, finalY + 7, { align: 'center' });
    
    doc.setFont('helvetica', 'bold');
    doc.text(settings.namaAdmin || 'ADMINISTRATOR', signatureX + signatureWidth/2, finalY + 30, { align: 'center' });
    doc.setLineWidth(0.2);
    doc.line(signatureX + 5, finalY + 31, signatureX + signatureWidth - 5, finalY + 31);
  }

  // 5. Output PDF (Preview instead of direct download)
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
};

/**
 * Generate Excel Report for Santri
 */
export const generateExcel = (data, columns, settings = {}) => {
  const tableHeaders = columns.map(col => col.label);
  const tableData = data.map((item, index) => {
    const row = {};
    columns.forEach(col => {
      if (col.key === 'row_number') {
        row[col.label] = index + 1;
      } else {
        row[col.label] = getExportValue(item, col, settings);
      }
    });
    return row;
  });

  const headerRows = [
    [settings.namaInstansi || 'YAYASAN RUBATH AL KAHFI (YAKFI) SOMALANGU'],
    [settings.alamatInstansi || 'Sekretariat : Komplek Doktren Al Kahfi Somalangu Po Box 32 Kebumen 54317 Jawa Tengah'],
    [''],
    ['LAPORAN DATA SANTRI'],
    ['']
  ];

  const ws = XLSX.utils.json_to_sheet(tableData, { origin: 'A6' });
  XLSX.utils.sheet_add_aoa(ws, headerRows, { origin: 'A1' });

  const wscols = columns.map(col => ({ wch: col.key === 'nama' ? 35 : 20 }));
  ws['!cols'] = wscols;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data Santri');

  XLSX.writeFile(wb, `Data_Santri_${new Date().getTime()}.xlsx`);
};

/**
 * Generate Combined Excel Report for Transactions (Pemasukan & Pengeluaran)
 */
export const generateCombinedTransactionExcel = (incomeData, outcomeData, settings = {}) => {
  const master = settings.masterData || {};
  
  const getLabel = (list, id) => {
    return list?.find(item => item.id === id || item.value === id)?.label || id || '-';
  };

  const formatRupiah = (num) => 'Rp ' + Number(num || 0).toLocaleString('id-ID');

  // --- PEMASUKAN LOGIC ---
  // Group income data first
  const groupedIncome = [];
  const incomeMap = new Map();
  if (incomeData) {
    incomeData.forEach(item => {
      const key = `${item.santri_id}-${item.created_at}`;
      if (!incomeMap.has(key)) {
        incomeMap.set(key, {
          ...item,
          nominal: Number(item.nominal) || 0,
          details: [{ jenis_bayar: item.jenis_bayar, nominal: item.nominal }]
        });
      } else {
        const existing = incomeMap.get(key);
        existing.nominal += Number(item.nominal) || 0;
        existing.details.push({ jenis_bayar: item.jenis_bayar, nominal: item.nominal });
      }
    });
    groupedIncome.push(...Array.from(incomeMap.values()));
  }

  const incomeColumns = [
    { label: 'Waktu', key: 'created_at' },
    { label: 'NIA', key: 'nia' },
    { label: 'Nama Santri', key: 'nama_santri' },
    { label: 'Detail Pembayaran', key: 'jenis_bayar' }, // Updated to show details
    { label: 'Total Nominal', key: 'nominal' },
    { label: 'Sumber Dana', key: 'sumber_dana' },
    { label: 'Kasir', key: 'kasir' },
    { label: 'Metode', key: 'metode_bayar' },
    { label: 'Keterangan', key: 'keterangan' }
  ];

  const incomeRows = groupedIncome.map(item => {
    const row = {};
    incomeColumns.forEach(col => {
      let val = item[col.key];
      
      if (col.key === 'created_at') {
        val = new Date(item.created_at).toLocaleString('id-ID');
      } else if (col.key === 'nia') val = item.databasesantri?.nia || '-';
      else if (col.key === 'nama_santri') val = item.databasesantri?.nama || '-';
      else if (col.key === 'jenis_bayar') {
        if (item.details && item.details.length > 1) {
          val = item.details.map(d => `${getLabel(master.jenisBayar, d.jenis_bayar)} (${formatRupiah(d.nominal)})`).join(', ');
        } else {
          val = getLabel(master.jenisBayar, item.jenis_bayar);
        }
      } else if (col.key === 'nominal') val = Number(item.nominal) || 0;
      else if (col.key === 'sumber_dana') {
        const found = master.sumberDanaList?.find(s => s.id === item.sumber_dana_id);
        if (found?.kode === 'lainnya' && item.sumber_dana_custom) {
          val = item.sumber_dana_custom;
        } else {
          val = found?.label || item.sumber_dana_id || '-';
        }
      } else if (col.key === 'kasir') val = getLabel(master.kasirList, item.kasir_id);
      else if (col.key === 'keterangan') val = item.sumber_dana_custom || '-';
      
      row[col.label] = val;
    });
    return row;
  });

  // --- PENGELUARAN LOGIC ---
  const outcomeColumns = [
    { label: 'Waktu', key: 'created_at' },
    { label: 'Pengambil', key: 'pengambil' },
    { label: 'Urgensi', key: 'urgensi' },
    { label: 'Deskripsi', key: 'deskripsi' },
    { label: 'Total Nominal', key: 'nominal' },
    { label: 'Detail Sumber Dana', key: 'sumber_dana' } // Updated to show details
  ];

  const outcomeRows = (outcomeData || []).map(item => {
    const row = {};
    outcomeColumns.forEach(col => {
      let val = item[col.key];
      
      if (col.key === 'created_at') {
        val = new Date(item.created_at).toLocaleString('id-ID');
      } else if (col.key === 'urgensi') val = getLabel(master.urgensiList, item.urgensi_id);
      else if (col.key === 'sumber_dana') {
        if (Array.isArray(item.sumber_dana) && item.sumber_dana.length > 0) {
          val = item.sumber_dana.map(s => `${getLabel(master.jenisBayar, s.jenis)} (${formatRupiah(s.nominal)})`).join(', ');
        } else {
          val = '-';
        }
      }
      
      row[col.label] = val;
    });
    return row;
  });

  // --- BUILD WORKBOOK ---
  const headerRows = [
    [settings.namaInstansi || 'YAYASAN RUBATH AL KAHFI (YAKFI) SOMALANGU'],
    [settings.alamatInstansi || 'Sekretariat : Komplek Doktren Al Kahfi Somalangu Po Box 32 Kebumen 54317 Jawa Tengah'],
    [''],
    ['LAPORAN TRANSAKSI KEUANGAN'],
    ['']
  ];

  const wb = XLSX.utils.book_new();

  if (incomeRows.length > 0) {
    const wsInc = XLSX.utils.json_to_sheet(incomeRows, { origin: 'A6' });
    XLSX.utils.sheet_add_aoa(wsInc, headerRows, { origin: 'A1' });
    wsInc['!cols'] = incomeColumns.map(() => ({ wch: 25 }));
    XLSX.utils.book_append_sheet(wb, wsInc, 'Pemasukan');
  }

  if (outcomeRows.length > 0) {
    const wsOut = XLSX.utils.json_to_sheet(outcomeRows, { origin: 'A6' });
    XLSX.utils.sheet_add_aoa(wsOut, headerRows, { origin: 'A1' });
    wsOut['!cols'] = outcomeColumns.map(() => ({ wch: 25 }));
    XLSX.utils.book_append_sheet(wb, wsOut, 'Pengeluaran');
  }

  if (incomeRows.length === 0 && outcomeRows.length === 0) {
    // Empty workbook placeholder
    const wsEmpty = XLSX.utils.json_to_sheet([{ Message: 'Tidak ada data transaksi' }]);
    XLSX.utils.book_append_sheet(wb, wsEmpty, 'Kosong');
  }

  XLSX.writeFile(wb, `Backup_Transaksi_${new Date().getTime()}.xlsx`);
};

/**
 * Generate Tunggakan PDF in Landscape 3:2 format
 */
export const generateTunggakanLandscapePDF = (santri, months, settings = {}) => {
  const doc = new jsPDF({
    orientation: 'l',
    unit: 'mm',
    format: [300, 200] // 3:2 ratio
  });

  const pageWidth = 300;
  const margin = 20;
  let currentY = 20;

  // 1. Header formal ala surat
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(settings.namaInstansi || 'YAYASAN RUBATH AL KAHFI', pageWidth / 2, currentY, { align: 'center' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  currentY += 7;
  doc.text(settings.alamatInstansi || '', pageWidth / 2, currentY, { align: 'center' });

  currentY += 5;
  doc.setLineWidth(0.8);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  doc.setLineWidth(0.2);
  doc.line(margin, currentY + 1, pageWidth - margin, currentY + 1);
  
  currentY += 15;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('SURAT PEMBERITAHUAN TUNGGAKAN PEMBAYARAN', pageWidth / 2, currentY, { align: 'center' });

  currentY += 15;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Assalamu'alaikum wrwb.`, margin, currentY);
  
  currentY += 10;
  doc.text(`Pangapunten nipun bu/pak Mohon Maaf Sebelumnya.`, margin, currentY);
  doc.text(`Ingin menyampaikan rincian tagihan pembayaran atas nama santri:`, margin, currentY + 6);
  
  currentY += 18;
  doc.setFont('helvetica', 'bold');
  doc.text(`NAMA  : ${santri.nama || '-'}`, margin + 5, currentY);
  currentY += 6;
  doc.text(`NIA   : ${santri.nia || '-'}`, margin + 5, currentY);
  currentY += 6;
  doc.text(`KAMAR : ${santri.kamar || '-'}`, margin + 5, currentY);

  currentY += 12;
  
  // 2. Table of Unpaid Items
  const tableHeaders = ['Bulan', 'Kategori', 'Target Tagihan', 'Sudah Dibayar', 'Sisa Tunggakan', 'Status'];
  const tableData = months.map(m => [
    m.name,
    settings.categoryLabel || 'Iuran',
    'Rp ' + m.target.toLocaleString('id-ID'),
    'Rp ' + m.paid.toLocaleString('id-ID'),
    'Rp ' + m.diff.toLocaleString('id-ID'),
    m.isPaid ? 'LUNAS' : (m.isUnpaid ? 'BELUM LUNAS' : '-')
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [tableHeaders],
    body: tableData,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: { fillColor: [60, 60, 60], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      4: { fontStyle: 'bold' },
      5: { fontStyle: 'bold' }
    },
    didParseCell: (data) => {
      if (data.column.index === 5 && data.cell.raw === 'BELUM LUNAS') {
        data.cell.styles.textColor = [220, 38, 38]; // Red
      }
      if (data.column.index === 5 && data.cell.raw === 'LUNAS') {
        data.cell.styles.textColor = [22, 163, 74]; // Green
      }
    }
  });

  currentY = doc.lastAutoTable.finalY + 15;
  
  // 3. Footer & Total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`TOTAL TUNGGAKAN : Rp ${santri.totalTunggakan.toLocaleString('id-ID')}`, pageWidth - margin, currentY, { align: 'right' });
  
  currentY += 15;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Mekaten ingkang saged kawulo aturaken Bu/Pa. Menawi gadah klentaklentunipun Nyuwun agunging pangapunten.`, margin, currentY);
  currentY += 5;
  doc.text(`Kangge Pembayaran Saget Langsung ke KETUA KAMAR atau Bendahara Asrama.`, margin, currentY);

  // Signature section
  currentY += 20;
  const sigX = pageWidth - margin - 70;
  doc.text(`Kebumen, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, sigX + 35, currentY, { align: 'center' });
  doc.text(settings.jabatanAdmin || 'Bendahara Asrama', sigX + 35, currentY + 6, { align: 'center' });
  
  doc.setFont('helvetica', 'bold');
  doc.text(settings.namaAdmin || 'MUHAMMAD ZIDNI RAMADHANI', sigX + 35, currentY + 30, { align: 'center' });
  doc.line(sigX + 10, currentY + 31, sigX + 60, currentY + 31);

  // Bank Info
  currentY += 5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('Informasi Rekening:', margin, currentY + 20);
  doc.text(settings.noRekening || '', margin, currentY + 24);

  // Output
  const categoryStr = settings.categoryLabel ? settings.categoryLabel.replace(/[^a-zA-Z0-9 ]/g, '') : '';
  const namaStr = santri.nama ? santri.nama.replace(/[^a-zA-Z0-9 ]/g, '') : '';
  const fileName = `Tagihan ${categoryStr} ${namaStr}`.trim() + '.pdf';
  
  doc.save(fileName);
};

/**
 * Generate Bulk Tunggakan PDF
 * Creates a list of all unpaid santri based on current filter
 */
export const generateBulkTunggakanPDF = (data, settings = {}) => {
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const margin = 15;
  let currentY = 15;

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(settings.namaInstansi || 'YAYASAN RUBATH AL KAHFI', pageWidth / 2, currentY, { align: 'center' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  currentY += 6;
  doc.text(settings.alamatInstansi || 'Sekretariat : Komplek Doktren Al Kahfi Somalangu Po Box 32 Kebumen', pageWidth / 2, currentY, { align: 'center' });

  currentY += 5;
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  
  currentY += 10;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('LAPORAN TUNGGAKAN SANTRI', pageWidth / 2, currentY, { align: 'center' });
  
  currentY += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Tahun: ${settings.year || '-'}`, margin, currentY);
  doc.text(`Kategori: ${settings.categoryLabel || '-'}`, pageWidth - margin, currentY, { align: 'right' });

  currentY += 5;

  // Table Data
  const tableHeaders = ['No', 'Nama / NIA', 'Kamar', 'Bulan Nunggak', 'Total Tunggakan'];
  
  let grandTotal = 0;

  const tableData = data.map((s, index) => {
    // Only collect months with debt
    const unpaidMonths = s.months.filter(m => m.isUnpaid).map(m => m.name).join(', ');
    grandTotal += s.totalTunggakan;

    return [
      index + 1,
      `${s.nama}\n${s.nia || '-'}`,
      s.kamar || '-',
      unpaidMonths || '-',
      'Rp ' + s.totalTunggakan.toLocaleString('id-ID')
    ];
  });

  // Add Grand Total Row
  tableData.push([
    '', '', '', 'TOTAL KESELURUHAN', 'Rp ' + grandTotal.toLocaleString('id-ID')
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [tableHeaders],
    body: tableData,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: { fillColor: [40, 40, 40], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 3, valign: 'middle' },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 55 },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 'auto' },
      4: { cellWidth: 35, halign: 'right', fontStyle: 'bold' }
    },
    didParseCell: (data) => {
      // Bold the last row (Grand Total)
      if (data.row.index === tableData.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [240, 240, 240];
      }
    }
  });

  currentY = doc.lastAutoTable.finalY + 15;
  
  // Footer Signature
  const sigX = pageWidth - margin - 60;
  doc.setFont('helvetica', 'normal');
  doc.text(`Kebumen, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, sigX + 30, currentY, { align: 'center' });
  doc.text(settings.jabatanAdmin || 'Bendahara Asrama', sigX + 30, currentY + 5, { align: 'center' });
  
  doc.setFont('helvetica', 'bold');
  doc.text(settings.namaAdmin || '-', sigX + 30, currentY + 25, { align: 'center' });
  doc.setLineWidth(0.3);
  doc.line(sigX + 5, currentY + 26, sigX + 55, currentY + 26);

  // Output
  const categoryStr = settings.categoryLabel ? settings.categoryLabel.replace(/[^a-zA-Z0-9 ]/g, '') : '';
  const yearStr = settings.year ? settings.year.toString() : '';
  const fileName = `Tunggakan ${categoryStr} ${yearStr}`.trim() + '.pdf';
  
  doc.save(fileName);
};
