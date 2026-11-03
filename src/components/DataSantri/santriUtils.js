/* santriUtils.js */

export const PROVINSI_OPTIONS = [
  "Aceh", "Sumatera Utara", "Sumatera Barat", "Riau", "Kepulauan Riau", "Jambi", 
  "Sumatera Selatan", "Bangka Belitung", "Bengkulu", "Lampung", "DKI Jakarta", 
  "Jawa Barat", "Banten", "Jawa Tengah", "DI Yogyakarta", "Jawa Timur", 
  "Bali", "Nusa Tenggara Barat", "Nusa Tenggara Timur", "Kalimantan Barat", 
  "Kalimantan Tengah", "Kalimantan Selatan", "Kalimantan Timur", "Kalimantan Utara", 
  "Sulawesi Utara", "Sulawesi Tengah", "Sulawesi Selatan", "Sulawesi Tenggara", 
  "Gorontalo", "Sulawesi Barat", "Maluku", "Maluku Utara", "Papua", 
  "Papua Barat", "Papua Selatan", "Papua Tengah", "Papua Pegunungan", "Papua Barat Daya"
].sort().map(p => ({ value: p, label: p }));

export const initialFormState = {
  nia: '', nama: '', nisn: '', nik: '', tempat_lahir: '', tanggal_lahir: '',
  kamar_id: '', 
  status_id: 1,     // Default: Aktif
  kategori: 1,      // Default: Anggota
  instansi_id: '',
  keterangan: '', desa: '', rt_rw: '', kecamatan: '', kabupaten_kota: '', provinsi: '',
  koordinat_pribadi: '', koordinat_saudara: '', no_wa_pribadi: '', email_pribadi: '',
  status_bpjs_id: 1, // Default: AKTIF
  nama_ayah: '', nama_ibu: '', 
  status_ortu_id: 1, // Default: MASIH LENGKAP
  keberadaan_ayah_id: 6, // Default: TIDAK MERANTAU
  keberadaan_ibu_id: 6, // Default: TIDAK MERANTAU
  pekerjaan_ayah: '', pekerjaan_ibu: '', no_wa_wali: '',
  penghasilan_ayah_id: '', penghasilan_ibu_id: '', 
  status_saudara_id: 2 // Default: Mengikuti Saudara yang Sudah Ada di Pondok
};

export const sanitizeString = (str) => {
  if (!str) return '';
  return str.toString().trim().replace(/\w\S*/g, (w) => (w.replace(/^\w/, (c) => c.toUpperCase())));
};

export const formatWA = (phone) => {
  if (!phone) return null;
  
  let cleaned = phone.toString().trim();
  cleaned = cleaned.replace(/\D/g, ''); 
  
  if (!cleaned) return '';

  if (cleaned.startsWith('0')) {
    return '62' + cleaned.slice(1);
  }
  
  if (cleaned.startsWith('8') && cleaned.length >= 9 && cleaned.length <= 13) {
    return '62' + cleaned;
  }

  return cleaned;
};

export const getCleanFormData = (rawFormData) => {
  const cleanData = {};
  Object.keys(initialFormState).forEach(key => {
    let val = rawFormData[key];
    
    if (typeof val === 'string' && val.trim() === '') {
        val = null;
    }
    
    cleanData[key] = val;
  });

  cleanData.no_wa_pribadi = formatWA(cleanData.no_wa_pribadi);
  cleanData.no_wa_wali = formatWA(cleanData.no_wa_wali);

  if (cleanData.rt_rw) {
    const parts = cleanData.rt_rw.split(/[,/]/);
    if (parts.length === 2) {
      const rt = parts[0].trim().padStart(3, '0');
      const rw = parts[1].trim().padStart(3, '0');
      cleanData.rt_rw = `${rt}/${rw}`;
    }
  }

  const formatJob = (job) => {
    if (!job) return null;
    return job.split(' ').map(word => {
      const cleanWord = word.toUpperCase();
      const acronyms = ['PNS', 'TNI', 'POLRI', 'ASN', 'IRT', 'WIRASWASTA'];
      if (word.length <= 3 || acronyms.includes(cleanWord)) return cleanWord;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');
  };
  cleanData.pekerjaan_ayah = formatJob(cleanData.pekerjaan_ayah);
  cleanData.pekerjaan_ibu = formatJob(cleanData.pekerjaan_ibu);

  const sId = parseInt(cleanData.status_ortu_id);
  
  if ([3, 4, 8, 9].includes(sId)) {
    cleanData.keberadaan_ayah_id = 6; 
    cleanData.penghasilan_ayah_id = null;
  }
  
  if ([2, 4, 5, 9].includes(sId)) {
    cleanData.keberadaan_ibu_id = 6; 
    cleanData.penghasilan_ibu_id = null;
  }

  return cleanData;
};
