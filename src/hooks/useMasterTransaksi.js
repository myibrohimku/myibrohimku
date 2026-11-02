import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

/**
 * Hook to fetch all reference data needed for transaction forms.
 * Returns: santriList, jenisBayar, kasirList, urgensiList, sumberDanaList, loading, refetch
 */
export function useMasterTransaksi() {
  const [santriList, setSantriList] = useState([]);
  const [jenisBayar, setJenisBayar] = useState([]);
  const [kasirList, setKasirList] = useState([]);
  const [urgensiList, setUrgensiList] = useState([]);
  const [sumberDanaList, setSumberDanaList] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [
        resSantri,
        resJenis,
        resKasir,
        resUrgensi,
        resSumber
      ] = await Promise.all([
        supabase.from('databasesantri').select('id, nia, nama').eq('is_deleted', false).order('nama'),
        supabase.from('ref_transak_bln').select('id_transak_bln, label_transak_bln').order('id_transak_bln'),
        supabase.from('ref_kasir').select('id_kasir, nama_kasir').order('id_kasir'),
        supabase.from('ref_urgensi').select('id_urgensi, urgensi_label').order('id_urgensi'),
        supabase.from('ref_sumber_dana').select('id, kode_sumber, label_sumber').eq('is_active', true).order('id')
      ]);

      if (resSantri.error) console.error('❌ Error fetch santri:', resSantri.error.message);
      else if (resSantri.data) {
        setSantriList(resSantri.data.map(s => ({
          id: s.nia,
          label: s.nama,
          santri_id: s.id
        })));
      }

      if (resJenis.error) console.error('❌ Error fetch jenis bayar:', resJenis.error.message);
      else if (resJenis.data) {
        setJenisBayar(resJenis.data.map(j => ({
          id: j.id_transak_bln,
          label: j.label_transak_bln
        })));
      }

      if (resKasir.error) console.error('❌ Error fetch kasir:', resKasir.error.message);
      else if (resKasir.data) {
        setKasirList(resKasir.data.map(k => ({
          id: k.id_kasir,
          label: k.nama_kasir
        })));
      }

      if (resUrgensi.error) console.error('❌ Error fetch urgensi:', resUrgensi.error.message);
      else if (resUrgensi.data) {
        setUrgensiList(resUrgensi.data.map(u => ({
          id: u.id_urgensi,
          label: u.urgensi_label
        })));
      }

      if (resSumber.error) console.error('❌ Error fetch sumber dana:', resSumber.error.message);
      else if (resSumber.data) {
        setSumberDanaList(resSumber.data.map(s => ({
          id: s.id,
          kode: s.kode_sumber,
          label: s.label_sumber
        })));
      }

    } catch (error) {
      console.error('💥 Fatal error fetching master transaksi:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { santriList, jenisBayar, kasirList, urgensiList, sumberDanaList, loading, refetch: fetchAll };
}

