import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useMasterDataSantri() {
  const [kamar, setKamar] = useState([]);
  const [instansi, setInstansi] = useState([]);
  const [statusSantri, setStatusSantri] = useState([]);
  const [kategori, setKategori] = useState([]);
  const [statusOrtu, setStatusOrtu] = useState([]);
  const [statusBpjs, setStatusBpjs] = useState([]);
  const [penghasilan, setPenghasilan] = useState([]);
  const [statusSaudara, setStatusSaudara] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMasterData = async () => {
      setLoading(true);
      try {
        const [
          resKamar,
          resInstansi,
          resKategori,
          resStatus,
          resOrtu,
          resBpjs,
          resPenghasilan,
          resStatusSaudara
        ] = await Promise.all([
          supabase.from('ref_kamar').select('id, nama_kamar').eq('is_active', true).order('nama_kamar'),
          supabase.from('ref_instansi').select('id, nama_instansi').eq('is_active', true).order('id'),
          supabase.from('ref_kategori_datasantri').select('id, nama_kategori').eq('is_active', true).order('id'),
          supabase.from('ref_status_santri').select('id, nama_status').eq('is_active', true).order('id'),
          supabase.from('ref_status_ortu').select('id, nama_status').eq('is_active', true).order('id'),
          supabase.from('ref_status_bpjs').select('id, nama_status').eq('is_active', true).order('id'),
          supabase.from('ref_penghasilan').select('id, rentang_penghasilan').eq('is_active', true).order('id'),
          supabase.from('ref_status_saudara').select('id, nama_status').eq('is_active', true).order('id')
        ]);

        if (resKamar.error) console.error("Error (Kamar):", resKamar.error);
        else if (resKamar.data) setKamar(resKamar.data.map(k => ({ value: k.id, label: k.nama_kamar })));

        if (resInstansi.error) console.error("Error (Instansi):", resInstansi.error);
        else if (resInstansi.data) setInstansi(resInstansi.data.map(i => ({ value: i.id, label: i.nama_instansi })));

        if (resKategori.error) console.error("Error (Kategori):", resKategori.error);
        else if (resKategori.data) setKategori(resKategori.data.map(c => ({ value: c.id, label: c.nama_kategori })));

        if (resStatus.error) console.error("Error (Status):", resStatus.error);
        else if (resStatus.data) setStatusSantri(resStatus.data.map(s => ({ value: s.id, label: s.nama_status })));

        if (resOrtu.error) console.error("Error (Ortu):", resOrtu.error);
        else if (resOrtu.data) setStatusOrtu(resOrtu.data.map(o => ({ value: o.id, label: o.nama_status })));

        if (resBpjs.error) console.error("Error (BPJS):", resBpjs.error);
        else if (resBpjs.data) setStatusBpjs(resBpjs.data.map(b => ({ value: b.id, label: b.nama_status })));

        if (resPenghasilan.error) console.error("Error (Penghasilan):", resPenghasilan.error);
        else if (resPenghasilan.data) setPenghasilan(resPenghasilan.data.map(p => ({ value: p.id, label: p.rentang_penghasilan })));

        if (resStatusSaudara.error) console.error("Error (Status Saudara):", resStatusSaudara.error);
        else if (resStatusSaudara.data) setStatusSaudara(resStatusSaudara.data.map(ss => ({ value: ss.id, label: ss.nama_status })));

      } catch (error) {
        console.error('Error fetching master data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMasterData();
  }, []);

  return { kamar, instansi, statusSantri, kategori, statusOrtu, statusBpjs, penghasilan, statusSaudara, loading };
}
