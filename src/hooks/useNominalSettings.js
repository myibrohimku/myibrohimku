import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

const MONTHS = [
  { id: 1, label: 'Jan', name: 'Januari' }, { id: 2, label: 'Feb', name: 'Februari' }, { id: 3, label: 'Mar', name: 'Maret' },
  { id: 4, label: 'Apr', name: 'April' }, { id: 5, label: 'Mei', name: 'Mei' }, { id: 6, label: 'Jun', name: 'Juni' },
  { id: 7, label: 'Jul', labelFull: 'Juli', name: 'Juli' }, { id: 8, label: 'Agu', name: 'Agustus' }, { id: 9, label: 'Sep', name: 'September' },
  { id: 10, label: 'Okt', name: 'Oktober' }, { id: 11, label: 'Nov', name: 'November' }, { id: 12, label: 'Des', name: 'Desember' }
];

export function useNominalSettings(highlightedPrefix) {
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [santriList, setSantriList] = useState([]);
  const [categoriesData, setCategoriesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Category Label State
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [savingLabel, setSavingLabel] = useState(false);
  
  const [activePrefix, setActivePrefix] = useState(highlightedPrefix || null);
  const [searchSantri, setSearchSantri] = useState('');
  const [checkedSantriIds, setCheckedSantriIds] = useState(new Set());
  
  const [matrixData, setMatrixData] = useState({});
  const [originalMatrix, setOriginalMatrix] = useState({});
  const [bulkInput, setBulkInput] = useState({});

  useEffect(() => {
    const fetchMasterData = async () => {
      setLoading(true);
      try {
        const { data: santri } = await supabase
          .from('databasesantri')
          .select(`id, nia, nama, kamar, status, instansi_pendidikan, desa, kecamatan, kabupaten_kota, provinsi, keterangan, ref_kamar(nama_kamar), ref_status_santri(nama_status), ref_kategori:ref_kategori_datasantri!kategori(nama_kategori), ref_instansi(nama_instansi)`)
          .eq('is_deleted', false)
          .order('nama');
        if (santri) setSantriList(santri);

        const { data: jenis } = await supabase
          .from('ref_transak_bln')
          .select('*')
          .order('id_transak_bln');
        if (jenis) setCategoriesData(jenis);

      } catch (err) {
        console.error('Error fetching master data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMasterData();
  }, []);

  useEffect(() => {
    if (highlightedPrefix) setActivePrefix(highlightedPrefix);
  }, [highlightedPrefix]);

  const activeCategoryInfo = useMemo(() => {
    if (!activePrefix || categoriesData.length === 0) return null;
    const items = categoriesData.filter(c => c.id_transak_bln.startsWith(activePrefix));
    if (items.length === 0) return null;
    
    const parts = items[0].label_transak_bln.split(' ');
    const baseLabel = parts.slice(0, -1).join(' ') || parts[0];
    
    return { prefix: activePrefix, label: baseLabel, items };
  }, [activePrefix, categoriesData]);

  useEffect(() => {
    const fetchMatrixData = async () => {
      if (!activeCategoryInfo) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('nominal_santri')
          .select('santri_id, jenis_bayar, nominal')
          .eq('tahun', tahun)
          .like('jenis_bayar', `${activeCategoryInfo.prefix}%`);
          
        if (error) throw error;

        const newMatrix = {};
        data.forEach(row => {
          const month = parseInt(row.jenis_bayar.slice(-2));
          if (!newMatrix[row.santri_id]) newMatrix[row.santri_id] = {};
          newMatrix[row.santri_id][month] = row.nominal;
        });

        setMatrixData(newMatrix);
        setOriginalMatrix(JSON.parse(JSON.stringify(newMatrix)));
        setCheckedSantriIds(new Set());
        setBulkInput({});
      } catch (err) {
        console.error('Error fetching matrix data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMatrixData();
  }, [activeCategoryInfo, tahun]);

  const parseInputToNumber = (val) => {
    if (val === '' || val === null || val === undefined) return '';
    const cleanStr = val.toString().replace(/[^0-9]/g, '');
    if (cleanStr === '') return '';
    return parseInt(cleanStr, 10);
  };

  // Simpan nilai raw (string) ke matrixData selama input berlangsung
  // agar angka 0 tidak berubah menjadi falsy dan menyebabkan increment liar di input controlled.
  // Konversi ke number hanya dilakukan saat handleSave.
  const handleMatrixChange = (santriId, monthId, value) => {
    // Hanya izinkan digit, tidak boleh negatif atau desimal
    const sanitized = value.replace(/[^0-9]/g, '');
    setMatrixData(prev => ({
      ...prev,
      [santriId]: {
        ...(prev[santriId] || {}),
        [monthId]: sanitized  // simpan sebagai string
      }
    }));
  };

  const filteredSantri = useMemo(() => {
    let q = searchSantri.trim();
    const isCommand = q.toUpperCase().startsWith('=INSERT{');
    
    if (isCommand) {
      const match = q.match(/^=INSERT\{([^}=]*)/i);
      q = (match && match[1]) ? match[1] : '';
    }

    if (!q.trim()) return santriList;
    
    q = q.toLowerCase();
    let keywords = isCommand 
      ? q.split(';').map(k => k.trim()).filter(k => k !== '')
      : q.split(/[,\s]+/).filter(k => k.trim() !== '');

    const qNoSpace = q.replace(/\s+/g, '');

    return santriList.filter(s => {
      const cleanKamarName = (s.ref_kamar?.nama_kamar || s.kamar || '').replace(/^kamar\s+/i, '');
      const searchFields = [
        s.nia, s.nama, cleanKamarName, s.ref_status_santri?.nama_status, 
        s.ref_kategori?.nama_kategori, s.instansi_pendidikan, s.ref_instansi?.nama_instansi,
        s.desa, s.kecamatan, s.kabupaten_kota, s.provinsi, s.keterangan
      ].filter(Boolean);
      
      const combinedText = searchFields.join(' ').toLowerCase();
      const combinedNoSpace = combinedText.replace(/\s+/g, '');

      if (isCommand) {
        return keywords.some(kw => {
          const kwNoSpace = kw.replace(/\s+/g, '');
          return combinedText.includes(kw) || combinedNoSpace.includes(kwNoSpace);
        });
      } else {
        return keywords.every(keyword => combinedText.includes(keyword)) || combinedNoSpace.includes(qNoSpace);
      }
    });
  }, [santriList, searchSantri]);

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter' && searchSantri.trim().startsWith('=INSERT{')) {
      const match = searchSantri.match(/^=INSERT\{(.*)\s*=\s*([0-9.,]+)\}$/i);
      
      if (match) {
        const criteriaPart = match[1];
        const newValue = parseInputToNumber(match[2]);
        const filters = criteriaPart.split(';').map(f => f.trim().toLowerCase()).filter(f => f !== '');
        
        if (filters.length === 0) return;

        // BUG FIX #1: Jika ada santri yang dicentang (checkedSantriIds),
        // prioritaskan hanya santri yang dicentang DAN cocok filter.
        // Jika tidak ada yang dicentang, gunakan semua yang cocok filter.
        const baseTargets = filteredSantri;
        const targets = checkedSantriIds.size > 0
          ? baseTargets.filter(s => checkedSantriIds.has(s.id))
          : baseTargets;

        if (targets.length === 0) {
          alert('Tidak ada santri yang cocok dengan kriteria: ' + filters.join(', '));
          return;
        }

        const confirmMsg = `Rumus terdeteksi: Set nominal Rp${newValue.toLocaleString()} untuk ${targets.length} santri yang cocok dengan "${filters.join(' & ')}" di SELURUH bulan?\n\nKlik OK untuk memproses (Data belum tersimpan ke database sebelum Anda klik tombol Simpan).`;
        
        if (window.confirm(confirmMsg)) {
          setMatrixData(prev => {
            const newData = { ...prev };
            targets.forEach(s => {
              if (!newData[s.id]) newData[s.id] = {};
              for (let m = 1; m <= 12; m++) {
                newData[s.id][m] = newValue;
              }
            });
            return newData;
          });
          setSearchSantri('');
          alert(`Berhasil memproses ${targets.length} santri.`);
        }
      } else {
        alert('Format rumus salah! Gunakan: =INSERT{kriteria1; kriteria2 = nilai}');
      }
    }
  };

  const handleToggleSantri = (id) => {
    setCheckedSantriIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const handleSelectAllFiltered = () => {
    if (checkedSantriIds.size === filteredSantri.length && filteredSantri.length > 0) {
      setCheckedSantriIds(new Set());
    } else {
      setCheckedSantriIds(new Set(filteredSantri.map(s => s.id)));
    }
  };



  const handleBulkInputChange = (monthId, value) => {
    // Simpan raw string ke bulkInput agar 0 tidak tampil kosong
    const sanitized = value.replace(/[^0-9]/g, '');
    setBulkInput(prev => ({ ...prev, [monthId]: sanitized }));
    const numValue = sanitized === '' ? '' : parseInt(sanitized, 10);
    
    if (checkedSantriIds.size === 0) return;

    // BUG FIX #2: Hanya update santri yang dicentang DAN masih ada di filteredSantri
    // (santri yang filter-nya berubah setelah dicentang tidak ikut ter-update)
    const validFilteredIds = new Set(filteredSantri.map(s => s.id));

    setMatrixData(prev => {
      const newData = { ...prev };
      checkedSantriIds.forEach(id => {
        if (!validFilteredIds.has(id)) return; // skip jika tidak terlihat di tabel
        if (!newData[id]) newData[id] = {};
        newData[id] = { ...newData[id], [monthId]: sanitized }; // simpan string
      });
      return newData;
    });
  };

  const handleGlobalBulkChange = (value) => {
    const sanitized = value.replace(/[^0-9]/g, '');
    const newBulk = {};
    MONTHS.forEach(m => newBulk[m.id] = sanitized);
    setBulkInput(newBulk);

    if (checkedSantriIds.size === 0) return;

    // BUG FIX #2 (Global): Sama seperti handleBulkInputChange,
    // hanya update santri yang dicentang DAN masih terlihat di tabel saat ini
    const validFilteredIds = new Set(filteredSantri.map(s => s.id));

    setMatrixData(prev => {
      const newData = { ...prev };
      checkedSantriIds.forEach(id => {
        if (!validFilteredIds.has(id)) return; // skip jika tidak terlihat
        if (!newData[id]) newData[id] = {};
        MONTHS.forEach(m => {
          newData[id] = { ...newData[id], [m.id]: sanitized }; // simpan string
        });
      });
      return newData;
    });
  };

  const handleSave = async () => {
    if (!activeCategoryInfo) return;

    setSaving(true);
    try {
      const recordsToUpsert = [];
      const recordsToDelete = [];

      // BUG FIX #3: Buat Set ID santri yang valid (terdaftar & aktif)
      // agar data orphan atau santri yang dihapus tidak ikut disimpan
      const validSantriIds = new Set(santriList.map(s => s.id));

      Object.entries(matrixData).forEach(([santriIdStr, monthsObj]) => {
        const santriId = parseInt(santriIdStr);

        // SKIP santri yang tidak terdaftar / sudah dihapus
        if (!validSantriIds.has(santriId)) return;

        Object.entries(monthsObj).forEach(([monthIdStr, nominal]) => {
          const monthId = parseInt(monthIdStr);
          const originalNominal = originalMatrix[santriId]?.[monthId];
          const jenisBayar = `${activeCategoryInfo.prefix}${monthId.toString().padStart(2, '0')}`;

          if (nominal !== '' && nominal !== undefined && String(nominal) !== String(originalNominal)) {
            // Konversi ke number saat save — bukan saat input
            const nominalNum = parseInt(nominal, 10);
            if (!isNaN(nominalNum)) {
              recordsToUpsert.push({ santri_id: santriId, jenis_bayar: jenisBayar, tahun: tahun, nominal: nominalNum });
            }
          } else if ((nominal === '' || nominal === undefined) && originalNominal !== undefined && originalNominal !== '') {
            recordsToDelete.push({ santriId, jenisBayar });
          }
        });
      });

      if (recordsToUpsert.length === 0 && recordsToDelete.length === 0) {
        alert('Tidak ada perubahan untuk disimpan.');
        setSaving(false);
        return;
      }

      const BATCH_SIZE = 500;
      for (let i = 0; i < recordsToUpsert.length; i += BATCH_SIZE) {
        const batch = recordsToUpsert.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from('nominal_santri').upsert(batch, { onConflict: 'santri_id,jenis_bayar,tahun' });
        if (error) throw error;
      }

      for (const rec of recordsToDelete) {
         await supabase.from('nominal_santri').delete()
          .eq('santri_id', rec.santriId)
          .eq('jenis_bayar', rec.jenisBayar)
          .eq('tahun', tahun);
      }

      setOriginalMatrix(JSON.parse(JSON.stringify(matrixData)));
      alert(`Berhasil menyimpan perubahan nominal.`);
    } catch (err) {
      alert('Gagal menyimpan: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCategoryLabel = async (e) => {
    e.preventDefault();
    if (!newLabel.trim() || !activeCategoryInfo) return;

    setSavingLabel(true);
    try {
      const updates = MONTHS.map(m => ({
        id_transak_bln: `${activeCategoryInfo.prefix}${m.id.toString().padStart(2, '0')}`,
        label_transak_bln: `${newLabel.trim()} ${m.name}`
      }));

      const { error } = await supabase.from('ref_transak_bln').upsert(updates);
      if (error) throw error;

      setCategoriesData(prev => prev.map(cat => {
        if (cat.id_transak_bln.startsWith(activeCategoryInfo.prefix)) {
          const monthId = parseInt(cat.id_transak_bln.slice(-2));
          const monthName = MONTHS.find(m => m.id === monthId)?.name;
          return { ...cat, label_transak_bln: `${newLabel.trim()} ${monthName}` };
        }
        return cat;
      }));

      setIsEditingLabel(false);
      alert('Nama kategori berhasil diperbarui!');
    } catch (err) {
      alert('Gagal memperbarui nama kategori: ' + err.message);
    } finally {
      setSavingLabel(false);
    }
  };

  return {
    MONTHS,
    tahun, setTahun,
    loading, saving,
    activePrefix, activeCategoryInfo,
    searchSantri, setSearchSantri, handleSearchKeyDown,
    filteredSantri,
    matrixData, originalMatrix,
    bulkInput,
    checkedSantriIds, handleToggleSantri, handleSelectAllFiltered,
    handleMatrixChange, handleBulkInputChange, handleGlobalBulkChange,
    handleSave,
    isEditingLabel, setIsEditingLabel, newLabel, setNewLabel, savingLabel, handleUpdateCategoryLabel
  };
}
