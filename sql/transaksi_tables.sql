-- ============================================================
-- SISTEM TRANSAKSI: Tabel & Kebijakan Keamanan (RLS)
-- Jalankan script ini di Supabase SQL Editor
-- ============================================================

-- 1. TABEL REFERENSI: SUMBER DANA
-- ============================================================
CREATE TABLE IF NOT EXISTS ref_sumber_dana (
  id SERIAL PRIMARY KEY,
  kode_sumber TEXT UNIQUE NOT NULL,
  label_sumber TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE
);

INSERT INTO ref_sumber_dana (kode_sumber, label_sumber) VALUES
  ('sendiri', 'Sendiri'),
  ('orangtua', 'Orangtua'),
  ('walikamar', 'Walikamar'),
  ('lainnya', 'Lainnya')
ON CONFLICT (kode_sumber) DO NOTHING;

ALTER TABLE ref_sumber_dana ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read ref_sumber_dana" ON ref_sumber_dana;
CREATE POLICY "Allow read ref_sumber_dana" ON ref_sumber_dana
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert ref_sumber_dana" ON ref_sumber_dana;
CREATE POLICY "Allow insert ref_sumber_dana" ON ref_sumber_dana
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update ref_sumber_dana" ON ref_sumber_dana;
CREATE POLICY "Allow update ref_sumber_dana" ON ref_sumber_dana
  FOR UPDATE USING (true) WITH CHECK (true);

-- 2. TABEL TRANSAKSI: PEMASUKAN (PAYMENT)
-- ============================================================
-- Satu baris = satu pembayaran untuk satu jenis_bayar
-- Duplikasi dicegah via UNIQUE constraint (santri + jenis + tahun)
CREATE TABLE IF NOT EXISTS transaksi_pemasukan (
  id BIGSERIAL PRIMARY KEY,
  santri_id BIGINT NOT NULL REFERENCES databasesantri(id),
  jenis_bayar TEXT NOT NULL,                    -- id_transak_bln (misal 'ld01', 'ks05')
  nominal BIGINT NOT NULL,
  kasir_id TEXT NOT NULL,                       -- id_kasir dari ref_kasir
  sumber_dana_id INT REFERENCES ref_sumber_dana(id),
  sumber_dana_custom TEXT,                      -- Teks custom jika sumber_dana = 'Lainnya'
  metode_bayar TEXT NOT NULL DEFAULT 'transfer', -- 'tunai' | 'transfer'
  tahun_bayar INT NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())::INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Cegah duplikasi: satu santri hanya bisa bayar satu jenis per tahun
  UNIQUE(santri_id, jenis_bayar, tahun_bayar)
);

ALTER TABLE transaksi_pemasukan ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all transaksi_pemasukan" ON transaksi_pemasukan;
CREATE POLICY "Allow all transaksi_pemasukan" ON transaksi_pemasukan
  FOR ALL USING (true) WITH CHECK (true);

-- Index untuk performa query
CREATE INDEX IF NOT EXISTS idx_pemasukan_santri ON transaksi_pemasukan(santri_id);
CREATE INDEX IF NOT EXISTS idx_pemasukan_jenis ON transaksi_pemasukan(jenis_bayar);
CREATE INDEX IF NOT EXISTS idx_pemasukan_created ON transaksi_pemasukan(created_at DESC);

-- 3. TABEL TRANSAKSI: PENGELUARAN (DOMPET)
-- ============================================================
CREATE TABLE IF NOT EXISTS transaksi_pengeluaran (
  id BIGSERIAL PRIMARY KEY,
  urgensi_id TEXT NOT NULL,                     -- id_urgensi dari ref_urgensi
  pengambil TEXT NOT NULL,
  deskripsi TEXT,
  nominal BIGINT NOT NULL,
  sumber_dana JSONB NOT NULL DEFAULT '[]',      -- Array: [{"jenis":"ld01","nominal":50000}, ...]
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE transaksi_pengeluaran ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all transaksi_pengeluaran" ON transaksi_pengeluaran;
CREATE POLICY "Allow all transaksi_pengeluaran" ON transaksi_pengeluaran
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_pengeluaran_created ON transaksi_pengeluaran(created_at DESC);

-- 4. TABEL DATA: NOMINAL PER-SANTRI PER-JENIS PER-TAHUN
-- ============================================================
-- Menyimpan berapa nominal yang harus dibayar tiap santri
-- untuk setiap jenis_bayar (ld01, ks01, gl01, dll) per tahun.
-- Editable di Settings page.
CREATE TABLE IF NOT EXISTS nominal_santri (
  id BIGSERIAL PRIMARY KEY,
  santri_id BIGINT NOT NULL REFERENCES databasesantri(id) ON DELETE CASCADE,
  jenis_bayar TEXT NOT NULL,                    -- id_transak_bln (misal 'ld01')
  nominal BIGINT NOT NULL DEFAULT 0,
  tahun INT NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())::INT,
  
  UNIQUE(santri_id, jenis_bayar, tahun)
);

ALTER TABLE nominal_santri ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all nominal_santri" ON nominal_santri;
CREATE POLICY "Allow all nominal_santri" ON nominal_santri
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_nominal_lookup ON nominal_santri(santri_id, tahun);
CREATE INDEX IF NOT EXISTS idx_nominal_jenis ON nominal_santri(jenis_bayar, tahun);

-- ============================================================
-- SELESAI. Pastikan tabel ref_transak_bln, ref_kasir, dan 
-- ref_urgensi sudah ada dan terisi data.
-- ============================================================
