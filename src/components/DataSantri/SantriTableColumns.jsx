import React from 'react';
import Badge from '../ui/Badge';

export const getSantriColumns = (kategoriOptions) => [
  { key: 'row_number', label: 'No.', width: '50px', align: 'center', render: (v, item, index) => index + 1 },
  { key: 'nia', label: 'NIA', width: '120px', sortable: true },
  { key: 'nama', label: 'NAMA', sortable: true },
  { 
    key: 'kamar', 
    label: 'KAMAR', 
    width: '150px', 
    render: (v, item) => <Badge variant="secondary">{item.ref_kamar?.nama_kamar || item.kamar || '-'}</Badge> 
  },
  { key: 'keterangan', label: 'KET', width: '150px' },
  {
    key: 'status', label: 'STATUS', width: '100px', render: (v, item) => {
      const statusName = item.ref_status_santri?.nama_status || item.status || '-';
      return <Badge variant={statusName === 'Aktif' ? 'success' : 'warning'}>{statusName}</Badge>;
    }
  },
  {
    key: 'kategori', label: 'KATEGORI', width: '120px', render: (v, item) => {
      const catLabel = kategoriOptions.find(opt => opt.value === v || opt.value === parseInt(v))?.label;
      return <Badge variant="secondary">{catLabel || v || '-'}</Badge>;
    }
  },
  { 
    key: 'instansi_pendidikan', 
    label: 'INSTANSI', 
    width: '180px', 
    render: (v, item) => <Badge variant="outline">{item.ref_instansi?.nama_instansi || item.instansi_pendidikan || '-'}</Badge> 
  },
  { key: 'nisn', label: 'NISN' },
  { key: 'nik', label: 'NIK' },
  { key: 'tempat_lahir', label: 'TEMPAT LAHIR' },
  { 
    key: 'tanggal_lahir', 
    label: 'TGL LAHIR', 
    render: (v) => {
      if (!v) return '-';
      const d = new Date(v);
      return isNaN(d.getTime()) ? v : d.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
  },
  { key: 'desa', label: 'DESA/KELURAHAN' },
  { key: 'rt_rw', label: 'RT/RW' },
  { key: 'kecamatan', label: 'KECAMATAN' },
  { key: 'kabupaten_kota', label: 'KAB/KOTA' },
  { key: 'provinsi', label: 'PROVINSI' },
  { key: 'koordinat_pribadi', label: 'KOORDINAT PRIBADI' },
  { key: 'koordinat_saudara', label: 'ALAMAT SAUDARA' },
  { key: 'email_pribadi', label: 'EMAIL' },
  { 
    key: 'no_wa_pribadi', 
    label: 'WA SANTRI', 
    render: (v) => v ? (
      <a href={`https://wa.me/${v}`} target="_blank" rel="noopener noreferrer" className="wa-link">
        {v}
      </a>
    ) : '-' 
  },
  { key: 'status_kis_bpjs', label: 'BPJS', render: (v, item) => item.rel_bpjs?.nama_status || v || '-' },
  { key: 'nama_ayah', label: 'AYAH' },
  { key: 'nama_ibu', label: 'IBU' },
  { 
    key: 'no_wa_wali', 
    label: 'WA WALI', 
    render: (v) => v ? (
      <a href={`https://wa.me/${v}`} target="_blank" rel="noopener noreferrer" className="wa-link">
        {v}
      </a>
    ) : '-' 
  },
  { key: 'pekerjaan_ayah', label: 'PEK. AYAH' },
  { key: 'pekerjaan_ibu', label: 'PEK. IBU' },
  { key: 'status_orangtua', label: 'S. ORTU', render: (v, item) => item.rel_ortu?.nama_status || v || '-' },
  { key: 'penghasilan_ayah', label: 'PGH. AYAH', render: (v, item) => item.rel_pgh_ayah?.rentang_penghasilan || '-' },
  { key: 'penghasilan_ibu', label: 'PGH. IBU', render: (v, item) => item.rel_pgh_ibu?.rentang_penghasilan || '-' },
  { key: 'status_saudara', label: 'STATUS SAUDARA', render: (v, item) => item.rel_status_saudara?.nama_status || '-' },
];
