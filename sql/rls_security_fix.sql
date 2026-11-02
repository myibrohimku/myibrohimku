-- ============================================================
-- SECURITY FIX: Row Level Security (RLS) untuk SEMUA Tabel
-- Jalankan script ini di Supabase SQL Editor
-- ============================================================
-- Script ini akan:
-- 1. Menghapus semua policy USING(true) yang tidak aman
-- 2. Membuat policy baru yang hanya mengizinkan user authenticated
-- ============================================================

-- ============================================================
-- 1. TABEL UTAMA: databasesantri
-- ============================================================
ALTER TABLE public.databasesantri ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all databasesantri" ON public.databasesantri;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.databasesantri;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.databasesantri;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.databasesantri;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.databasesantri;

CREATE POLICY "auth_select_databasesantri" ON public.databasesantri
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_insert_databasesantri" ON public.databasesantri
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_update_databasesantri" ON public.databasesantri
  FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_delete_databasesantri" ON public.databasesantri
  FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================================
-- 2. TABEL TRANSAKSI: transaksi_pemasukan
-- ============================================================
DROP POLICY IF EXISTS "Allow all transaksi_pemasukan" ON public.transaksi_pemasukan;

CREATE POLICY "auth_select_transaksi_pemasukan" ON public.transaksi_pemasukan
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_insert_transaksi_pemasukan" ON public.transaksi_pemasukan
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_update_transaksi_pemasukan" ON public.transaksi_pemasukan
  FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_delete_transaksi_pemasukan" ON public.transaksi_pemasukan
  FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================================
-- 3. TABEL TRANSAKSI: transaksi_pengeluaran
-- ============================================================
DROP POLICY IF EXISTS "Allow all transaksi_pengeluaran" ON public.transaksi_pengeluaran;

CREATE POLICY "auth_select_transaksi_pengeluaran" ON public.transaksi_pengeluaran
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_insert_transaksi_pengeluaran" ON public.transaksi_pengeluaran
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_update_transaksi_pengeluaran" ON public.transaksi_pengeluaran
  FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_delete_transaksi_pengeluaran" ON public.transaksi_pengeluaran
  FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================================
-- 4. TABEL DATA: nominal_santri
-- ============================================================
DROP POLICY IF EXISTS "Allow all nominal_santri" ON public.nominal_santri;

CREATE POLICY "auth_select_nominal_santri" ON public.nominal_santri
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_insert_nominal_santri" ON public.nominal_santri
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_update_nominal_santri" ON public.nominal_santri
  FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_delete_nominal_santri" ON public.nominal_santri
  FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================================
-- 5. TABEL REFERENSI: ref_sumber_dana
-- ============================================================
DROP POLICY IF EXISTS "Allow read ref_sumber_dana" ON public.ref_sumber_dana;
DROP POLICY IF EXISTS "Allow insert ref_sumber_dana" ON public.ref_sumber_dana;
DROP POLICY IF EXISTS "Allow update ref_sumber_dana" ON public.ref_sumber_dana;

CREATE POLICY "auth_select_ref_sumber_dana" ON public.ref_sumber_dana
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_insert_ref_sumber_dana" ON public.ref_sumber_dana
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_update_ref_sumber_dana" ON public.ref_sumber_dana
  FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- 6. TABEL REFERENSI: ref_transak_bln
-- ============================================================
ALTER TABLE public.ref_transak_bln ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all ref_transak_bln" ON public.ref_transak_bln;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.ref_transak_bln;

CREATE POLICY "auth_select_ref_transak_bln" ON public.ref_transak_bln
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_insert_ref_transak_bln" ON public.ref_transak_bln
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_update_ref_transak_bln" ON public.ref_transak_bln
  FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- 7. TABEL REFERENSI: ref_kasir
-- ============================================================
ALTER TABLE public.ref_kasir ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all ref_kasir" ON public.ref_kasir;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.ref_kasir;

CREATE POLICY "auth_select_ref_kasir" ON public.ref_kasir
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_insert_ref_kasir" ON public.ref_kasir
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_update_ref_kasir" ON public.ref_kasir
  FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- 8. TABEL REFERENSI: ref_urgensi
-- ============================================================
ALTER TABLE public.ref_urgensi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all ref_urgensi" ON public.ref_urgensi;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.ref_urgensi;

CREATE POLICY "auth_select_ref_urgensi" ON public.ref_urgensi
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_insert_ref_urgensi" ON public.ref_urgensi
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_update_ref_urgensi" ON public.ref_urgensi
  FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- 9. TABEL SETTING: setting_struk
-- ============================================================
DROP POLICY IF EXISTS "Enable read access for all users" ON public.setting_struk;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.setting_struk;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.setting_struk;

CREATE POLICY "auth_select_setting_struk" ON public.setting_struk
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_insert_setting_struk" ON public.setting_struk
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_update_setting_struk" ON public.setting_struk
  FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- 10. TABEL SETTING: ref_settings
-- ============================================================
ALTER TABLE public.ref_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all ref_settings" ON public.ref_settings;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.ref_settings;

CREATE POLICY "auth_select_ref_settings" ON public.ref_settings
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_insert_ref_settings" ON public.ref_settings
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_update_ref_settings" ON public.ref_settings
  FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- 11. TABEL REFERENSI MASTER DATA SANTRI
-- ============================================================

-- ref_kamar
ALTER TABLE public.ref_kamar ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all ref_kamar" ON public.ref_kamar;
CREATE POLICY "auth_select_ref_kamar" ON public.ref_kamar
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_insert_ref_kamar" ON public.ref_kamar
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_update_ref_kamar" ON public.ref_kamar
  FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ref_instansi
ALTER TABLE public.ref_instansi ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all ref_instansi" ON public.ref_instansi;
CREATE POLICY "auth_select_ref_instansi" ON public.ref_instansi
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_insert_ref_instansi" ON public.ref_instansi
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_update_ref_instansi" ON public.ref_instansi
  FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ref_kategori_datasantri
ALTER TABLE public.ref_kategori_datasantri ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all ref_kategori_datasantri" ON public.ref_kategori_datasantri;
CREATE POLICY "auth_select_ref_kategori_datasantri" ON public.ref_kategori_datasantri
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_insert_ref_kategori_datasantri" ON public.ref_kategori_datasantri
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_update_ref_kategori_datasantri" ON public.ref_kategori_datasantri
  FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ref_status_santri
ALTER TABLE public.ref_status_santri ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all ref_status_santri" ON public.ref_status_santri;
CREATE POLICY "auth_select_ref_status_santri" ON public.ref_status_santri
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_insert_ref_status_santri" ON public.ref_status_santri
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_update_ref_status_santri" ON public.ref_status_santri
  FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ref_status_ortu
ALTER TABLE public.ref_status_ortu ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all ref_status_ortu" ON public.ref_status_ortu;
CREATE POLICY "auth_select_ref_status_ortu" ON public.ref_status_ortu
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_insert_ref_status_ortu" ON public.ref_status_ortu
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_update_ref_status_ortu" ON public.ref_status_ortu
  FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ref_status_bpjs
ALTER TABLE public.ref_status_bpjs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all ref_status_bpjs" ON public.ref_status_bpjs;
CREATE POLICY "auth_select_ref_status_bpjs" ON public.ref_status_bpjs
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_insert_ref_status_bpjs" ON public.ref_status_bpjs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_update_ref_status_bpjs" ON public.ref_status_bpjs
  FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ref_penghasilan
ALTER TABLE public.ref_penghasilan ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all ref_penghasilan" ON public.ref_penghasilan;
CREATE POLICY "auth_select_ref_penghasilan" ON public.ref_penghasilan
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_insert_ref_penghasilan" ON public.ref_penghasilan
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_update_ref_penghasilan" ON public.ref_penghasilan
  FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ref_status_saudara
ALTER TABLE public.ref_status_saudara ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all ref_status_saudara" ON public.ref_status_saudara;
CREATE POLICY "auth_select_ref_status_saudara" ON public.ref_status_saudara
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_insert_ref_status_saudara" ON public.ref_status_saudara
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_update_ref_status_saudara" ON public.ref_status_saudara
  FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- SELESAI! Semua tabel kini hanya bisa diakses oleh user
-- yang sudah login melalui Supabase Auth.
-- ============================================================
