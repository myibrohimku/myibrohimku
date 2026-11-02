import { X, Save } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Dropdown from '../ui/Dropdown';
import './SantriForm.css';

export default function SantriForm({
  isOpen,
  onClose,
  formData,
  onInputChange,
  onSubmit,
  isEditing,
  masterData
}) {
  const {
    kamar: kamarOptions = [],
    instansi: instansiOptions = [],
    statusSantri: statusOptions = [],
    kategori: kategoriOptions = [],
    statusOrtu: statusOrtuOptions = [],
    statusBpjs: statusBpjsOptions = [],
    penghasilan: penghasilanOptions = [],
    statusSaudara: statusSaudaraOptions = [],
    provinsiOptions = []
  } = masterData || {};

  const statusUtamaOptions = statusOrtuOptions.filter(opt => (opt.value >= 1 && opt.value <= 5) || opt.value === 8 || opt.value === 9);
  const statusMerantauOptions = statusOrtuOptions.filter(opt => opt.value >= 6 && opt.value <= 7);

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={isEditing ? "Edit Data Santri" : "Formulir Santri Baru"} 
      maxWidth="900px"
      bodyClassName="santri-modal-body"
    >

      <form onSubmit={onSubmit} className="santri-form">
        <div className="form-scroll-area">

          {/* Bagian 1: Data Pribadi */}
          <div className="form-section">
            <h4 className="section-title">Data Pribadi</h4>
            <div className="form-grid">
              <Input 
                label="NIA" 
                placeholder="Kosongkan untuk otomatis (Contoh: 10001)" 
                value={formData.nia} 
                onChange={(e) => onInputChange('nia', e.target.value)} 
                formatType="numberOnly" 
              />
              <Input 
                label="Nama Lengkap" 
                placeholder="Masukkan nama sesuai KTP" 
                value={formData.nama} 
                onChange={(e) => onInputChange('nama', e.target.value)} 
                formatType="titleCase" 
                required 
              />
              <Input 
                label="NISN" 
                placeholder="10 digit NISN" 
                value={formData.nisn} 
                onChange={(e) => onInputChange('nisn', e.target.value)} 
                formatType="nisn" 
              />
              <Input 
                label="NIK" 
                placeholder="16 digit NIK" 
                value={formData.nik} 
                onChange={(e) => onInputChange('nik', e.target.value)} 
                formatType="nik" 
              />
              <div className="form-row">
                <Input 
                  label="Tempat Lahir" 
                  value={formData.tempat_lahir} 
                  onChange={(e) => onInputChange('tempat_lahir', e.target.value)} 
                  formatType="titleCase" 
                />
                <Input 
                  label="Tanggal Lahir" 
                  type="date" 
                  value={formData.tanggal_lahir} 
                  onChange={(e) => onInputChange('tanggal_lahir', e.target.value)} 
                />
              </div>
              <div className="form-row">
                <Input 
                  label="WA Pribadi" 
                  placeholder="08xxx" 
                  value={formData.no_wa_pribadi} 
                  onChange={(e) => onInputChange('no_wa_pribadi', e.target.value)} 
                  formatType="numberOnly" 
                />
                <Input 
                  label="Email" 
                  type="email" 
                  placeholder="example@mail.com" 
                  value={formData.email_pribadi} 
                  onChange={(e) => onInputChange('email_pribadi', e.target.value)} 
                />
              </div>
              <p className="field-hint">Format: 08xxx atau +[kode negara] jika luar negeri</p>
            </div>
          </div>

          {/* Bagian 2: Status & Akademik */}
          <div className="form-section">
            <h4 className="section-title">Data Asrama</h4>
            <div className="form-grid">
              <Dropdown
                label="Instansi Pendidikan"
                options={instansiOptions}
                value={formData.instansi_id}
                onChange={(val) => onInputChange('instansi_id', val)}
                placeholder="Pilih Instansi"
              />
              <Dropdown
                label="Kamar"
                options={kamarOptions}
                value={formData.kamar_id}
                onChange={(val) => onInputChange('kamar_id', val)}
                placeholder="Pilih Kamar"
              />
              <Dropdown
                label="Kategori"
                options={kategoriOptions?.length > 0 ? kategoriOptions : [{ value: '', label: 'Data Kosong / Cek RLS' }]}
                value={formData.kategori}
                onChange={(val) => onInputChange('kategori', val)}
                placeholder="Pilih Kategori"
              />
              <Dropdown
                label="Status"
                options={statusOptions}
                value={formData.status_id}
                onChange={(val) => onInputChange('status_id', val)}
                placeholder="Pilih Status"
              />
              <Input
                label="Keterangan Jabatan"
                placeholder="Contoh: Ketua Kamar, dsb"
                value={formData.keterangan}
                onChange={(e) => onInputChange('keterangan', e.target.value)}
                formatType="titleCase"
              />
            </div>
          </div>

          {/* Bagian 3: Alamat Lengkap */}
          <div className="form-section">
            <h4 className="section-title">Alamat Domisili</h4>
            <div className="form-grid">
              <Input label="Desa/Kelurahan" value={formData.desa} onChange={(e) => onInputChange('desa', e.target.value)} formatType="titleCase" />
              <div className="form-row">
                <Input label="RT/RW" placeholder="001/002" value={formData.rt_rw} onChange={(e) => onInputChange('rt_rw', e.target.value)} formatType="uppercase" />
                <Input label="Kecamatan" value={formData.kecamatan} onChange={(e) => onInputChange('kecamatan', e.target.value)} formatType="titleCase" />
              </div>
              <Input label="Kabupaten/Kota" value={formData.kabupaten_kota} onChange={(e) => onInputChange('kabupaten_kota', e.target.value)} formatType="titleCase" />
              <Dropdown
                label="Provinsi"
                options={provinsiOptions}
                value={formData.provinsi}
                onChange={(val) => onInputChange('provinsi', val)}
                placeholder="Pilih Provinsi"
              />
              <div className="form-row">
                <Input label="Koordinat Pribadi" placeholder="-7.xxx, 112.xxx" value={formData.koordinat_pribadi} onChange={(e) => onInputChange('koordinat_pribadi', e.target.value)} />
                <Input label="Alamat Saudara Santri (Jika Ada)" placeholder="Contoh: Jl. Merdeka No. 123 atau koordinat" value={formData.koordinat_saudara} onChange={(e) => onInputChange('koordinat_saudara', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Bagian 4: Keluarga & Kontak */}
          <div className="form-section">
            <h4 className="section-title">Keluarga & Kontak</h4>
            <div className="form-grid">
              <div className="form-row">
                <Input label="Nama Ayah" value={formData.nama_ayah} onChange={(e) => onInputChange('nama_ayah', e.target.value)} formatType="titleCase" />
                <Input label="Nama Ibu" value={formData.nama_ibu} onChange={(e) => onInputChange('nama_ibu', e.target.value)} formatType="titleCase" />
              </div>
              <div className="form-row">
                <Input label="Pekerjaan Ayah" value={formData.pekerjaan_ayah} onChange={(e) => onInputChange('pekerjaan_ayah', e.target.value)} formatType="titleCase" />
                <Input label="Pekerjaan Ibu" value={formData.pekerjaan_ibu} onChange={(e) => onInputChange('pekerjaan_ibu', e.target.value)} formatType="titleCase" />
              </div>
              <div className="form-row">
                <Dropdown
                  label="Status Orangtua"
                  options={statusUtamaOptions}
                  value={formData.status_ortu_id}
                  onChange={(val) => onInputChange('status_ortu_id', val)}
                  placeholder="Pilih Status Orangtua"
                />
                <Dropdown
                  label="Status KIS BPJS"
                  options={statusBpjsOptions}
                  value={formData.status_bpjs_id}
                  onChange={(val) => onInputChange('status_bpjs_id', val)}
                  placeholder="Pilih Status BPJS"
                />
              </div>
              <div className="form-row">
                <Dropdown
                  label="Status Keberadaan Ayah"
                  options={statusMerantauOptions}
                  value={formData.keberadaan_ayah_id}
                  onChange={(val) => onInputChange('keberadaan_ayah_id', val)}
                  placeholder="Pilih Keberadaan Ayah"
                  disabled={formData.status_ortu_id === 3 || formData.status_ortu_id === 4 || formData.status_ortu_id === 8 || formData.status_ortu_id === 9}
                />
                <Dropdown
                  label="Status Keberadaan Ibu"
                  options={statusMerantauOptions}
                  value={formData.keberadaan_ibu_id}
                  onChange={(val) => onInputChange('keberadaan_ibu_id', val)}
                  placeholder="Pilih Keberadaan Ibu"
                  disabled={formData.status_ortu_id === 2 || formData.status_ortu_id === 4 || formData.status_ortu_id === 5}
                />
              </div>
              <div className="form-row">
                <Dropdown
                  label="Penghasilan Ayah"
                  options={penghasilanOptions}
                  value={formData.penghasilan_ayah_id}
                  onChange={(val) => onInputChange('penghasilan_ayah_id', val)}
                  placeholder="Pilih Penghasilan Ayah"
                  disabled={formData.status_ortu_id === 3 || formData.status_ortu_id === 4 || formData.status_ortu_id === 8 || formData.status_ortu_id === 9}
                />
                <Dropdown
                  label="Penghasilan Ibu"
                  options={penghasilanOptions}
                  value={formData.penghasilan_ibu_id}
                  onChange={(val) => onInputChange('penghasilan_ibu_id', val)}
                  placeholder="Pilih Penghasilan Ibu"
                  disabled={formData.status_ortu_id === 2 || formData.status_ortu_id === 4 || formData.status_ortu_id === 5 || formData.status_ortu_id === 9}
                />
              </div>
              <div className="form-row">
                <Dropdown
                  label="Status Saudara Santri"
                  options={statusSaudaraOptions}
                  value={formData.status_saudara_id}
                  onChange={(val) => onInputChange('status_saudara_id', val)}
                  placeholder="Pilih Status Saudara"
                  direction="up"
                />
                <Input label="WA Ortu/Wali" placeholder="08xxx" value={formData.no_wa_wali} onChange={(e) => onInputChange('no_wa_wali', e.target.value)} formatType="numberOnly" />
              </div>
              <p className="field-hint">Format: 08xxx atau +[kode negara] jika luar negeri</p>
            </div>
          </div>

        </div>

        <div className="form-footer">
          <Button type="button" variant="ghost" icon={X} onClick={onClose}>Batal</Button>
          <Button type="submit" variant="primary" icon={Save} className="flex-1">
            Simpan
          </Button>
        </div>
      </form>
    </Modal>
  );
}
