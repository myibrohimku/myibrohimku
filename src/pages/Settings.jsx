import { useState, useEffect, useCallback } from 'react';
import { User, Lock, Palette, Bell, Save, FileText, Database, Trash2, AlertTriangle, CheckSquare, DollarSign, Send } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabaseClient';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import ImageUploader from '../components/ui/ImageUploader';
import Badge from '../components/ui/Badge';
import ConfirmPopup from '../components/ui/ConfirmPopup';
import TransactionSettings from '../components/Settings/TransactionSettings';
import './Settings.css';

const SANTRI_COLUMNS = [
  { id: 'nia', label: 'NIA', fields: ['nia'] },
  { id: 'nama', label: 'Nama Lengkap', fields: ['nama'] },
  { id: 'nisn', label: 'NISN', fields: ['nisn'] },
  { id: 'nik', label: 'NIK', fields: ['nik'] },
  { id: 'tempat_lahir', label: 'Tempat Lahir', fields: ['tempat_lahir'] },
  { id: 'tanggal_lahir', label: 'Tanggal Lahir', fields: ['tanggal_lahir'] },
  { id: 'kamar', label: 'Kamar', fields: ['kamar_id', 'kamar'] },
  { id: 'status', label: 'Status Santri', fields: ['status_id', 'status'] },
  { id: 'kategori', label: 'Kategori', fields: ['kategori'] },
  { id: 'instansi', label: 'Instansi Pendidikan', fields: ['instansi_id', 'instansi_pendidikan'] },
  { id: 'keterangan', label: 'Keterangan', fields: ['keterangan'] },
  { id: 'desa', label: 'Desa/Kelurahan', fields: ['desa'] },
  { id: 'rt_rw', label: 'RT/RW', fields: ['rt_rw'] },
  { id: 'kecamatan', label: 'Kecamatan', fields: ['kecamatan'] },
  { id: 'kabupaten_kota', label: 'Kabupaten/Kota', fields: ['kabupaten_kota'] },
  { id: 'provinsi', label: 'Provinsi', fields: ['provinsi'] },
  { id: 'koordinat_pribadi', label: 'Koordinat Pribadi', fields: ['koordinat_pribadi'] },
  { id: 'koordinat_saudara', label: 'Alamat Saudara', fields: ['koordinat_saudara'] },
  { id: 'no_wa_pribadi', label: 'No. WA Pribadi', fields: ['no_wa_pribadi'] },
  { id: 'email_pribadi', label: 'Email Pribadi', fields: ['email_pribadi'] },
  { id: 'bpjs', label: 'Status BPJS (KIS)', fields: ['status_bpjs_id', 'status_kis_bpjs'] },
  { id: 'nama_ayah', label: 'Nama Ayah', fields: ['nama_ayah'] },
  { id: 'nama_ibu', label: 'Nama Ibu', fields: ['nama_ibu'] },
  { id: 'status_ortu', label: 'Status Orang Tua', fields: ['status_ortu_id', 'status_orangtua'] },
  { id: 'keberadaan_ayah', label: 'Keberadaan Ayah', fields: ['keberadaan_ayah_id'] },
  { id: 'keberadaan_ibu', label: 'Keberadaan Ibu', fields: ['keberadaan_ibu_id'] },
  { id: 'pekerjaan_ayah', label: 'Pekerjaan Ayah', fields: ['pekerjaan_ayah'] },
  { id: 'pekerjaan_ibu', label: 'Pekerjaan Ibu', fields: ['pekerjaan_ibu'] },
  { id: 'no_wa_wali', label: 'No. WA Wali', fields: ['no_wa_wali'] },
  { id: 'penghasilan_ayah', label: 'Penghasilan Ayah', fields: ['penghasilan_ayah_id'] },
  { id: 'penghasilan_ibu', label: 'Penghasilan Ibu', fields: ['penghasilan_ibu_id'] },
  { id: 'status_saudara', label: 'Status Saudara', fields: ['status_saudara_id'] },
];

export default function Settings() {
  const { 
    user, updateProfile, updatePassword,
    logoUrl, updateLogo, resetLogo, 
    reportSettings, updateReportSettings,
    waSettings, updateWaSettings,
    notifSettings, updateNotifSettings,
    addToast 
  } = useApp();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('transactions');

  const [reportForm, setReportForm] = useState({ ...reportSettings });
  const [waForm, setWaForm] = useState({ ...waSettings });
  const [notifForm, setNotifForm] = useState({ ...notifSettings });

  const [profileForm, setProfileForm] = useState({
    name: user.name,
    email: user.email,
  });

  const [passwordForm, setPasswordForm] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [dbMode, setDbMode] = useState('clear_columns');
  const [selectedColumns, setSelectedColumns] = useState([]);

  // --- LOGIKA DIRTY CHECK (CEK PERUBAHAN) ---
  const checkIsDirty = useCallback(() => {
    // Bandingkan state form saat ini dengan data asli dari Context
    const isProfileDirty = profileForm.name !== user.name || profileForm.email !== user.email;
    const isReportDirty = JSON.stringify(reportForm) !== JSON.stringify(reportSettings);
    const isWaDirty = JSON.stringify(waForm) !== JSON.stringify(waSettings);
    const isNotifDirty = JSON.stringify(notifForm) !== JSON.stringify(notifSettings);
    const isPasswordDirty = passwordForm.new !== '';

    return isProfileDirty || isReportDirty || isWaDirty || isNotifDirty || isPasswordDirty;
  }, [profileForm, reportForm, waForm, notifForm, passwordForm, user, reportSettings, waSettings, notifSettings]);

  // Gunakan useEffect untuk mencegah refresh/tutup browser saat data belum disimpan
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (checkIsDirty()) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [checkIsDirty]);

  const handleTabChange = (newTab) => {
    if (activeTab === newTab) return;

    if (checkIsDirty()) {
      const confirmLeave = window.confirm('Anda memiliki perubahan yang belum disimpan. Yakin ingin pindah tab tanpa menyimpan?');
      if (!confirmLeave) return;
    }
    
    // Reset form ke data asli jika user memilih untuk pindah tanpa simpan
    setProfileForm({ name: user.name, email: user.email });
    setReportForm({ ...reportSettings });
    setWaForm({ ...waSettings });
    setNotifForm({ ...notifSettings });
    setPasswordForm({ current: '', new: '', confirm: '' });
    
    setActiveTab(newTab);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      await updateProfile(profileForm);
      addToast('Profil berhasil diperbarui di server');
    } catch (err) {
      addToast('Gagal memperbarui profil: ' + err.message, 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.new !== passwordForm.confirm) {
      return addToast('Konfirmasi password tidak cocok', 'warning');
    }
    if (passwordForm.new.length < 6) {
      return addToast('Password minimal 6 karakter', 'warning');
    }

    setIsUpdating(true);
    try {
      await updatePassword(passwordForm.new);
      addToast('Password berhasil diperbarui');
      setPasswordForm({ current: '', new: '', confirm: '' });
    } catch (err) {
      addToast('Gagal memperbarui password: ' + err.message, 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogoUpload = async (file) => {
    try {
      await updateLogo(file);
      addToast('Logo website berhasil diperbarui di server');
    } catch (err) {
      addToast('Gagal upload logo: ' + err.message, 'error');
    }
  };

  const toggleColumnSelection = (columnId) => {
    setSelectedColumns(prev => 
      prev.includes(columnId) 
        ? prev.filter(id => id !== columnId) 
        : [...prev, columnId]
    );
  };

  const handleSelectAllColumns = () => {
    if (selectedColumns.length === SANTRI_COLUMNS.length) {
      setSelectedColumns([]);
    } else {
      setSelectedColumns(SANTRI_COLUMNS.map(c => c.id));
    }
  };

  const handleExecuteMaintenance = async () => {
    setIsDeleting(true);
    try {
      if (dbMode === 'all') {
        const { error } = await supabase.from('databasesantri').delete().neq('id', 0); // Delete all
        if (error) throw error;
        addToast('Semua data santri berhasil dihapus', 'success');
      } else {
        if (selectedColumns.length === 0) {
          addToast('Silakan pilih minimal satu kolom', 'warning');
          setIsDeleting(false);
          setIsConfirmOpen(false);
          return;
        }

        const updateData = {};
        selectedColumns.forEach(id => {
          const column = SANTRI_COLUMNS.find(c => c.id === id);
          if (column && column.fields) {
            column.fields.forEach(field => {
              updateData[field] = null;
            });
          }
        });

        const { error } = await supabase.from('databasesantri').update(updateData).neq('id', 0);
        if (error) throw error;
        addToast(`${selectedColumns.length} kolom berhasil dikosongkan untuk semua santri`, 'success');
      }
      setSelectedColumns([]);
    } catch (err) {
      addToast('Gagal memproses data: ' + err.message, 'error');
    } finally {
      setIsDeleting(false);
      setIsConfirmOpen(false);
    }
  };

  return (
    <div className="settings">
      <div className="page-header">
        <h1 className="page-title">Pengaturan</h1>
        <p className="page-subtitle">Kelola profil dan preferensi aplikasi</p>
      </div>

      <div className="settings__container">
        <aside className="settings__nav">
          <button className={`settings__nav-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => handleTabChange('profile')}>
            <User size={18} /> <span>Profil</span>
          </button>
          <button className={`settings__nav-item ${activeTab === 'security' ? 'active' : ''}`} onClick={() => handleTabChange('security')}>
            <Lock size={18} /> <span>Keamanan</span>
          </button>
          <button className={`settings__nav-item ${activeTab === 'appearance' ? 'active' : ''}`} onClick={() => handleTabChange('appearance')}>
            <Palette size={18} /> <span>Tampilan</span>
          </button>
          <button className={`settings__nav-item ${activeTab === 'notifications' ? 'active' : ''}`} onClick={() => handleTabChange('notifications')}>
            <Bell size={18} /> <span>Notifikasi</span>
          </button>
          <button className={`settings__nav-item ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => handleTabChange('reports')}>
            <FileText size={18} /> <span>Laporan</span>
          </button>
          <button className={`settings__nav-item ${activeTab === 'whatsapp' ? 'active' : ''}`} onClick={() => handleTabChange('whatsapp')}>
            <Send size={18} /> <span>WhatsApp</span>
          </button>
          <button className={`settings__nav-item ${activeTab === 'transactions' ? 'active' : ''}`} onClick={() => handleTabChange('transactions')}>
            <DollarSign size={18} /> <span>Transaksi</span>
          </button>
          <button className={`settings__nav-item ${activeTab === 'database' ? 'active' : ''}`} onClick={() => handleTabChange('database')}>
            <Database size={18} /> <span>Database</span>
          </button>
        </aside>

        <main className="card card--padded settings__content">
          {activeTab === 'profile' && (
            <div className="settings__section animate-fade-in">
              <h3 className="settings__section-title">Informasi Profil</h3>
              <form onSubmit={handleSaveProfile} className="settings__form">
                <ImageUploader 
                  label="Foto Profil" 
                  value={user.avatar} 
                  onChange={(file) => {
                    const reader = new FileReader();
                    reader.onload = (e) => updateProfile({ avatar: e.target.result });
                    reader.readAsDataURL(file);
                  }} 
                  onRemove={() => updateProfile({ avatar: null })}
                />
                <div className="settings__form-grid">
                  <Input 
                    label="Nama Lengkap" 
                    value={profileForm.name} 
                    onChange={(e) => setProfileForm({...profileForm, name: e.target.value})} 
                  />
                  <Input 
                    label="Alamat Email" 
                    type="email" 
                    value={profileForm.email} 
                    onChange={(e) => setProfileForm({...profileForm, email: e.target.value})} 
                    disabled
                  />
                </div>
                <p className="settings__hint" style={{ marginBottom: 'var(--sp-4)' }}>Email akun tidak dapat diubah dari halaman ini. Hubungi administrator jika perlu mengganti email login.</p>
                <Button type="submit" icon={Save} disabled={isUpdating}>
                  {isUpdating ? 'Menyimpan...' : 'Simpan Perubahan'}
                </Button>
              </form>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="settings__section animate-fade-in">
              <h3 className="settings__section-title">Keamanan Akun</h3>
              <form onSubmit={handleUpdatePassword} className="settings__form">
                <Input 
                  label="Password Baru" 
                  type="password" 
                  value={passwordForm.new}
                  onChange={(e) => setPasswordForm({...passwordForm, new: e.target.value})}
                  required
                />
                <Input 
                  label="Konfirmasi Password Baru" 
                  type="password" 
                  value={passwordForm.confirm}
                  onChange={(e) => setPasswordForm({...passwordForm, confirm: e.target.value})}
                  required
                />
                <Button type="submit" icon={Lock} disabled={isUpdating}>
                  {isUpdating ? 'Memperbarui...' : 'Perbarui Password'}
                </Button>
                <p className="settings__hint mt-2">Password minimal harus terdiri dari 6 karakter.</p>
              </form>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="settings__section animate-fade-in">
              <h3 className="settings__section-title">Tema & Branding</h3>
              <div className="settings__appearance-grid">
                <div className="settings__option">
                  <span className="settings__option-label">Mode Tampilan</span>
                  <div className="settings__theme-toggle">
                    <button className={`theme-btn ${theme === 'light' ? 'active' : ''}`} onClick={() => theme !== 'light' && toggleTheme()}>Terang</button>
                    <button className={`theme-btn ${theme === 'dark' ? 'active' : ''}`} onClick={() => theme !== 'dark' && toggleTheme()}>Gelap</button>
                  </div>
                </div>
                <div className="settings__option">
                  <span className="settings__option-label">Logo Website</span>
                  <ImageUploader value={logoUrl} onChange={handleLogoUpload} onRemove={resetLogo} />
                  <p className="settings__hint">Logo ini akan muncul di Navbar dan Halaman Login.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="settings__section animate-fade-in">
              <h3 className="settings__section-title">Pengaturan Notifikasi</h3>
              <p className="settings__hint mb-6">Pilih jenis peringatan (Early Warning System) yang ingin Anda terima di pojok kanan atas aplikasi.</p>
              
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  updateNotifSettings(notifForm);
                  addToast('Preferensi notifikasi berhasil disimpan');
                }}
                className="settings__form"
              >
                <div className="settings__toggles" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
                  
                  <div className="toggle-row card card--padded" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 className="font-bold text-primary mb-1">🚨 Peringatan Tunggakan</h4>
                      <p className="text-sm text-secondary">Muncul otomatis saat ada tagihan bulan lalu yang belum lunas (SPP/Pendaftaran).</p>
                    </div>
                    <label className="toggle-switch">
                      <input 
                        type="checkbox" 
                        checked={notifForm.tunggakan} 
                        onChange={(e) => setNotifForm({...notifForm, tunggakan: e.target.checked})}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="toggle-row card card--padded" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 className="font-bold text-primary mb-1">💸 Anomali Pengeluaran</h4>
                      <p className="text-sm text-secondary">Peringatan saat tercatat ada pengeluaran dana (Dompet) di atas Rp 1.000.000 dalam 7 hari terakhir.</p>
                    </div>
                    <label className="toggle-switch">
                      <input 
                        type="checkbox" 
                        checked={notifForm.anomali} 
                        onChange={(e) => setNotifForm({...notifForm, anomali: e.target.checked})}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="toggle-row card card--padded" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 className="font-bold text-primary mb-1">⚙️ Pengingat Sistem</h4>
                      <p className="text-sm text-secondary">Asisten virtual yang mengingatkan kelengkapan data santri & persiapan pengaturan nominal ajaran baru.</p>
                    </div>
                    <label className="toggle-switch">
                      <input 
                        type="checkbox" 
                        checked={notifForm.sistem} 
                        onChange={(e) => setNotifForm({...notifForm, sistem: e.target.checked})}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="toggle-row card card--padded" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '2px solid var(--primary-200)', background: 'var(--primary-100)' }}>
                    <div>
                      <h4 className="font-bold text-primary mb-1">📧 Notifikasi Email (Resend)</h4>
                      <p className="text-sm text-secondary">Kirim laporan otomatis ke email Anda setiap ada transaksi masuk/keluar di database.</p>
                    </div>
                    <label className="toggle-switch">
                      <input 
                        type="checkbox" 
                        checked={notifForm.email} 
                        onChange={(e) => setNotifForm({...notifForm, email: e.target.checked})}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                </div>

                <div className="mt-6">
                  <Button type="submit" icon={Save}>Simpan Preferensi Notifikasi</Button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="settings__section animate-fade-in">
              <h3 className="settings__section-title">Konfigurasi Laporan (Kop Surat & Tanda Tangan)</h3>
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  updateReportSettings(reportForm);
                  addToast('Pengaturan laporan berhasil disimpan ke database');
                }} 
                className="settings__form"
              >
                <div className="settings__report-grid">
                  <div className="settings__report-logo">
                    <ImageUploader 
                      label="Logo Kop Surat" 
                      value={reportForm.logo} 
                      onChange={(file) => {
                        const reader = new FileReader();
                        reader.onload = (e) => setReportForm({ ...reportForm, logo: e.target.result });
                        reader.readAsDataURL(file);
                      }}
                      onRemove={() => setReportForm({ ...reportForm, logo: null })}
                    />
                    <p className="settings__hint">Logo ini akan muncul di pojok kiri atas Kop Surat laporan PDF.</p>
                  </div>

                  <div className="settings__report-details">
                    <Input 
                      label="Nama Instansi (Kop Surat)" 
                      value={reportForm.namaInstansi} 
                      onChange={(e) => setReportForm({ ...reportForm, namaInstansi: e.target.value })}
                      placeholder="Contoh: YAYASAN RUBATH AL KAHFI"
                    />
                    <Input 
                      label="Alamat Instansi / Sekretariat" 
                      value={reportForm.alamatInstansi} 
                      onChange={(e) => setReportForm({ ...reportForm, alamatInstansi: e.target.value })}
                      placeholder="Alamat lengkap instansi..."
                    />
                    
                    <div className="settings__form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)', marginTop: 'var(--sp-4)' }}>
                      <Input 
                        label="Nama Admin / Pengurus" 
                        value={reportForm.namaAdmin} 
                        onChange={(e) => setReportForm({ ...reportForm, namaAdmin: e.target.value })}
                        placeholder="Nama lengkap..."
                      />
                      <Input 
                        label="Jabatan" 
                        value={reportForm.jabatanAdmin} 
                        onChange={(e) => setReportForm({ ...reportForm, jabatanAdmin: e.target.value })}
                        placeholder="Contoh: Sekretaris"
                      />
                    </div>
                  </div>
                </div>

                <div className="settings__report-preview card" style={{ marginTop: 'var(--sp-6)', padding: 'var(--sp-6)', background: 'white', color: 'black', border: '1px solid #ddd' }}>
                  <div style={{ fontSize: '0.7rem', color: '#999', marginBottom: '10px' }}>Preview Kop Surat:</div>
                  <div style={{ display: 'flex', alignItems: 'center', borderBottom: '2px solid black', paddingBottom: '10px' }}>
                    {reportForm.logo ? (
                      <img src={reportForm.logo} alt="Logo" style={{ width: '50px', height: '50px', objectFit: 'contain', marginRight: '15px' }} />
                    ) : (
                      <div style={{ width: '50px', height: '50px', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '15px', fontSize: '0.6rem' }}>LOGO</div>
                    )}
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '1.1rem', textTransform: 'uppercase' }}>{reportForm.namaInstansi || 'NAMA INSTANSI'}</div>
                      <div style={{ fontSize: '0.8rem' }}>{reportForm.alamatInstansi || 'Alamat Instansi...'}</div>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <Button type="submit" icon={Save}>Simpan ke Database</Button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'whatsapp' && (
            <div className="settings__section animate-fade-in">
              <h3 className="settings__section-title">Pengaturan Format Pesan WhatsApp</h3>
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  updateWaSettings(waForm);
                  addToast('Pengaturan WhatsApp berhasil diperbarui');
                }}
                className="settings__form"
              >
                <div className="settings__form-grid">
                  <Input 
                    label="Nama Kasir / Pengirim" 
                    value={waForm.namaKasir} 
                    onChange={(e) => setWaForm({ ...waForm, namaKasir: e.target.value })}
                    placeholder="Contoh: MUHAMMAD ZIDNI RAMADHANI"
                  />
                  <Input 
                    label="Jabatan / Keterangan" 
                    value={waForm.jabatan} 
                    onChange={(e) => setWaForm({ ...waForm, jabatan: e.target.value })}
                    placeholder="Contoh: BENDAHARA"
                  />
                </div>
                
                <div className="settings__field-group mt-4">
                  <label className="settings__label">Informasi Rekening / Pembayaran</label>
                  <textarea 
                    className="settings__textarea"
                    rows={4}
                    value={waForm.noRekening}
                    onChange={(e) => setWaForm({ ...waForm, noRekening: e.target.value })}
                    placeholder="Contoh: BRI 3086 ...\nMUHAMMAD ZIDTNI RAMADHANI"
                    style={{ 
                      width: '100%', 
                      padding: 'var(--sp-3)', 
                      borderRadius: 'var(--r-2)', 
                      border: '1px solid var(--neutral-300)',
                      background: 'var(--surface-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                <div className="wa-preview mt-8 card card--padded" style={{ background: '#e5ddd5', borderRadius: 'var(--r-4)', color: '#000' }}>
                  <div style={{ fontSize: '0.7rem', color: '#666', marginBottom: '8px', textTransform: 'uppercase', fontWeight: 'bold' }}>Preview Pesan:</div>
                  <div style={{ background: '#fff', padding: '12px', borderRadius: '8px', boxShadow: '0 1px 1px rgba(0,0,0,0.1)', whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>
                    Assalamu'alaikum wrwb.{"\n\n"}
                    Pangapunten nipun bu/pak Mohon Maaf Sebelumnya.{"\n"}
                    Kulo <span style={{ color: '#007bff', fontWeight: 'bold' }}>{waForm.namaKasir || '[Nama Kasir]'}</span>{"\n"}
                    <span style={{ color: '#007bff', fontWeight: 'bold' }}>{waForm.jabatan || '[Jabatan]'}</span> Asrama Sayyid Ibrohim Utara.{"\n\n"}
                    Ingin menyampaikan bahwa tagihan Pembayaran Laundry [Kategori] pada bulan Mei 2026 atas nama,{"\n"}
                    <span style={{ fontWeight: 'bold' }}>*A. ABDUR ROFI*</span> [Nama]{"\n"}
                    Sejumlah,{"\n"}
                    Rp 40.000 [Nominal] Bulan Mei [Bulan]{"\n"}
                    ----------------------------------------{"\n"}
                    Total = Rp 40.000 [Total]{"\n\n"}
                    Kangge Pembayaran Saget Langsung ke KETUA KAMAR KAMAR MASING MASING Atau Langsung Ke Bendahara Asrama.{"\n\n"}
                    Mekaten ingkang saged kawulo aturaken Bu/Pa.{"\n"}
                    Menawi gadah klentaklentunipun Nyuwun agunging pangapunten.{"\n\n"}
                    Assalamu'alaikum wrwb.{"\n\n"}
                    NO. REKENING{"\n"}
                    {waForm.noRekening || '[Informasi Rekening]'}
                  </div>
                </div>

                <div className="mt-6">
                  <Button type="submit" icon={Save}>Simpan Pengaturan WA</Button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'transactions' && (
            <TransactionSettings />
          )}

          {activeTab === 'database' && (
            <div className="settings__section animate-fade-in">
              <div className="settings__section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-6)' }}>
                <h3 className="settings__section-title" style={{ marginBottom: 0 }}>Pemeliharaan Database Santri</h3>
                <Badge variant="badge--red">Danger Zone</Badge>
              </div>
              
              <div className="maintenance-box card" style={{ padding: 'var(--sp-6)', border: '1px solid var(--neutral-200)', borderRadius: 'var(--r-4)' }}>
                <div className="maintenance-mode" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)', marginBottom: 'var(--sp-8)' }}>
                  <label className={`mode-option ${dbMode === 'all' ? 'selected' : ''}`} style={{ cursor: 'pointer', position: 'relative' }}>
                    <input 
                      type="radio" 
                      name="dbMode" 
                      value="all" 
                      checked={dbMode === 'all'} 
                      onChange={(e) => setDbMode(e.target.value)} 
                      style={{ position: 'absolute', opacity: 0 }}
                    />
                    <div className="mode-content" style={{ padding: 'var(--sp-4)', border: '2px solid transparent', borderRadius: 'var(--r-3)', background: 'var(--surface-secondary)', transition: 'all 0.2s', display: 'flex', gap: 'var(--sp-4)', alignItems: 'center', height: '100%' }}>
                      <div className="mode-icon-wrapper" style={{ width: '40px', height: '40px', borderRadius: '50%', background: dbMode === 'all' ? 'var(--primary-300)' : 'var(--neutral-300)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                        <Trash2 size={20} />
                      </div>
                      <div>
                        <span className="mode-title" style={{ display: 'block', fontWeight: 'bold', fontSize: '1rem', color: 'var(--text-primary)' }}>Hapus Semua Data</span>
                        <p className="mode-desc" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Menghapus seluruh record santri.</p>
                      </div>
                    </div>
                  </label>

                  <label className={`mode-option ${dbMode === 'clear_columns' ? 'selected' : ''}`} style={{ cursor: 'pointer', position: 'relative' }}>
                    <input 
                      type="radio" 
                      name="dbMode" 
                      value="clear_columns" 
                      checked={dbMode === 'clear_columns'} 
                      onChange={(e) => setDbMode(e.target.value)} 
                      style={{ position: 'absolute', opacity: 0 }}
                    />
                    <div className="mode-content" style={{ padding: 'var(--sp-4)', border: '2px solid transparent', borderRadius: 'var(--r-3)', background: 'var(--surface-secondary)', transition: 'all 0.2s', display: 'flex', gap: 'var(--sp-4)', alignItems: 'center', height: '100%' }}>
                      <div className="mode-icon-wrapper" style={{ width: '40px', height: '40px', borderRadius: '50%', background: dbMode === 'clear_columns' ? 'var(--primary-300)' : 'var(--neutral-300)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                        <CheckSquare size={20} />
                      </div>
                      <div>
                        <span className="mode-title" style={{ display: 'block', fontWeight: 'bold', fontSize: '1rem', color: 'var(--text-primary)' }}>Kosongkan Kolom</span>
                        <p className="mode-desc" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Pilih kolom yang ingin dikosongkan.</p>
                      </div>
                    </div>
                  </label>
                </div>

                {dbMode === 'clear_columns' && (
                  <div className="column-selector animate-slide-down" style={{ marginBottom: 'var(--sp-8)', padding: 'var(--sp-4)', background: 'var(--surface-primary)', borderRadius: 'var(--r-3)', border: '1px solid var(--neutral-200)' }}>
                    <div className="column-selector-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-4)' }}>
                      <span className="font-bold text-sm">Pilih Kolom:</span>
                      <button className="text-primary text-xs font-semibold" onClick={handleSelectAllColumns}>
                        {selectedColumns.length === SANTRI_COLUMNS.length ? 'Batalkan Semua' : 'Pilih Semua'}
                      </button>
                    </div>
                    <div className="column-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 'var(--sp-2)' }}>
                      {SANTRI_COLUMNS.map(col => (
                        <label key={col.id} className="column-item" style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', fontSize: '0.8rem', cursor: 'pointer', padding: 'var(--sp-1) var(--sp-2)', borderRadius: 'var(--r-1)', transition: 'background 0.2s' }}>
                          <input 
                            type="checkbox" 
                            checked={selectedColumns.includes(col.id)} 
                            onChange={() => toggleColumnSelection(col.id)} 
                          />
                          <span>{col.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="maintenance-warning" style={{ display: 'flex', gap: 'var(--sp-3)', alignItems: 'center', padding: 'var(--sp-4)', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--r-3)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', marginBottom: 'var(--sp-6)', fontSize: '0.85rem' }}>
                  <AlertTriangle size={18} />
                  <span>Perhatian: Aksi ini akan memodifikasi data secara permanen pada tabel <strong>databasesantri</strong>.</span>
                </div>

                <div className="maintenance-actions">
                  <Button 
                    variant="danger" 
                    icon={Trash2} 
                    onClick={() => setIsConfirmOpen(true)}
                    disabled={dbMode === 'clear_columns' && selectedColumns.length === 0}
                    className="w-full"
                  >
                    Eksekusi Pemeliharaan
                  </Button>
                </div>
              </div>

              <ConfirmPopup 
                isOpen={isConfirmOpen}
                onCancel={() => setIsConfirmOpen(false)}
                onConfirm={handleExecuteMaintenance}
                title="Konfirmasi Penghapusan Permanen"
                message={dbMode === 'all' 
                  ? "Apakah Anda yakin ingin menghapus SELURUH data santri? Tindakan ini tidak dapat dibatalkan."
                  : `Apakah Anda yakin ingin mengosongkan data pada ${selectedColumns.length} kolom yang dipilih untuk SEMUA santri?`
                }
                confirmText={isDeleting ? "Memproses..." : "Ya, Hapus Permanen"}
                variant="danger"
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
