import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

/**
 * Hook to compute per-room statistics from databasesantri.
 *
 * Returns an array of room objects:
 * {
 *   kamarId,
 *   namaKamar,
 *   total,            // total semua santri (aktif + non-aktif + boyong + lulus)
 *   aktif,            // status 'aktif'
 *   nonAktif,         // status 'non-aktif' / 'nonaktif'
 *   boyong,           // status 'boyong'
 *   lulus,            // status 'lulus'
 *   anggota,          // aktif tanpa keterangan ketua kamar
 *   noLaundry,        // aktif yang tidak ikut laundry (nominal 0)
 *   instansi: [{ nama, count }]  // hanya yang count > 0
 * }
 */
export function useRoomStats() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRoomStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [santriRes, laundryRes] = await Promise.all([
        supabase
          .from('databasesantri')
          .select(`
            id,
            keterangan,
            kamar_id,
            ref_kamar(nama_kamar),
            ref_status_santri(nama_status),
            instansi_id,
            ref_instansi(nama_instansi),
            kategori,
            ref_kategori_datasantri(nama_kategori)
          `)
          .eq('is_deleted', false)
          .order('kamar_id', { ascending: true }),
        supabase
          .from('nominal_santri')
          .select('santri_id')
          .like('jenis_bayar', 'ld%')
          .eq('nominal', 0)
          .eq('tahun', new Date().getFullYear())
      ]);

      if (santriRes.error) throw santriRes.error;
      if (laundryRes.error) throw laundryRes.error;

      const freeLaundrySet = new Set((laundryRes.data || []).map(l => l.santri_id));

      // Group by kamar
      const kamarMap = {};

      (santriRes.data || []).forEach(s => {
        const kamarId   = s.kamar_id ?? '__tanpa_kamar__';
        const namaKamar = s.ref_kamar?.nama_kamar || 'Tanpa Kamar';
        const status    = (s.ref_status_santri?.nama_status || '').toLowerCase().trim();
        const instansi  = s.ref_instansi?.nama_instansi || null;
        const keterangan = (s.keterangan || '').toLowerCase();
        const kategoriName = (s.ref_kategori_datasantri?.nama_kategori || '').toLowerCase().trim();
        const isKetua   = keterangan.includes('ketua') || 
                          kategoriName.includes('pengurus') || 
                          namaKamar.toLowerCase().includes('pengurus');

        if (!kamarMap[kamarId]) {
          kamarMap[kamarId] = {
            kamarId,
            namaKamar,
            total:      0,
            aktif:      0,
            nonAktif:   0,
            keluar:     0,
            alumni:     0,
            anggota:    0,
            noLaundry:  0,
            instansiMap: {},
          };
        }

        const r = kamarMap[kamarId];
        r.total++;

        if (status === 'aktif') {
          r.aktif++;
          if (!isKetua) r.anggota++;
          if (freeLaundrySet.has(s.id)) r.noLaundry++;
        } else if (kategoriName === 'alumni') {
          r.alumni++;
        } else if (kategoriName === 'keluar') {
          r.keluar++;
        } else if (
          status === 'non-aktif' ||
          status === 'nonaktif'  ||
          status === 'non aktif'
        ) {
          r.nonAktif++;
        }

        // Instansi — hanya santri aktif
        if (status === 'aktif' && instansi) {
          r.instansiMap[instansi] = (r.instansiMap[instansi] || 0) + 1;
        }
      });

      // Convert ke array, sort by nama kamar
      const result = Object.values(kamarMap)
        .map(r => ({
          kamarId:    r.kamarId,
          namaKamar:  r.namaKamar,
          total:      r.total,
          aktif:      r.aktif,
          nonAktif:   r.nonAktif,
          keluar:     r.keluar,
          alumni:     r.alumni,
          anggota:    r.anggota,
          noLaundry:  r.noLaundry,
          // Hanya tampilkan instansi yang count > 0
          instansi:   Object.entries(r.instansiMap)
            .filter(([, cnt]) => cnt > 0)
            .map(([nama, count]) => ({ nama, count }))
            .sort((a, b) => b.count - a.count),
        }))
        .sort((a, b) => a.namaKamar.localeCompare(b.namaKamar));

      setRooms(result);
    } catch (err) {
      console.error('[useRoomStats]', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRoomStats(); }, [fetchRoomStats]);

  return { rooms, loading, error, refetch: fetchRoomStats };
}
