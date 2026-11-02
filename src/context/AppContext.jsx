import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import logoDefault from '../assets/logo-main.png';
import { supabase } from '../lib/supabaseClient';

const AppContext = createContext();

// Helper: Mengambil informasi user dari Supabase session
function mapSession(session) {
  if (!session?.user) return null;
  const u = session.user;
  return {
    id: u.id,
    name: u.user_metadata?.full_name || u.email?.split('@')[0] || 'Admin',
    email: u.email,
    avatar: u.user_metadata?.avatar_url || null,
    role: u.user_metadata?.role || 'Administrator',
    permissions: [],
    isLoggedIn: true
  };
}

export function AppProvider({ children }) {
  // ============================================================
  // SUPABASE AUTH: Session-based authentication
  // ============================================================
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const fetchProfileAndSetUser = async (session) => {
      if (!session) {
        setUser(null);
        setAuthLoading(false);
        return;
      }
      
      try {
        const { data: profile, error } = await supabase
          .from('users_profile')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (profile) {
          if (profile.is_active === false) {
            await supabase.auth.signOut();
            setUser(null);
            alert('Akses Ditolak: Akun Anda telah dinonaktifkan oleh Administrator.');
          } else {
            setUser({
              id: session.user.id,
              name: profile.nama,
              email: session.user.email,
              avatar: session.user.user_metadata?.avatar_url || null,
              role: profile.role,
              permissions: profile.permissions || [],
              isLoggedIn: true
            });
          }
        } else {
          setUser(mapSession(session));
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setUser(mapSession(session));
      }
      setAuthLoading(false);
    };

    // 1. Cek sesi aktif saat aplikasi pertama kali dibuka
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchProfileAndSetUser(session);
    });

    // 2. Listener real-time: otomatis mendeteksi login, logout, token refresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === 'SIGNED_IN') {
         setAuthLoading(true);
      }
      fetchProfileAndSetUser(session);
    });

    // Cleanup saat komponen unmount
    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    
    // Update last login
    if (data?.user) {
      supabase.from('users_profile')
        .update({ last_login_at: new Date() })
        .eq('id', data.user.id)
        .then(() => {}); // silent update
    }
    
    return data;
  }, []);

  // Logout: Hapus sesi dari Supabase server
  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  // Update profil user (nama, avatar) ke Supabase Auth
  const updateProfile = useCallback(async (data) => {
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: data.name,
          avatar_url: data.avatar
        }
      });
      if (error) throw error;
      
      setUser(prev => ({ ...prev, ...data }));
    } catch (err) {
      console.error('Gagal update profil:', err.message);
      throw err;
    }
  }, []);

  // Update Password
  const updatePassword = useCallback(async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }, []);

  // ============================================================
  // NON-AUTH STATE (tetap sama, tidak diubah)
  // ============================================================
  const [logoUrl, setLogoUrl] = useState(() => {
    return localStorage.getItem('myibrohim-logo') || logoDefault;
  });

  const [reportSettings, setReportSettings] = useState(() => {
    const saved = localStorage.getItem('myibrohim-report-settings');
    return saved ? JSON.parse(saved) : {
      namaInstansi: 'Asrama Sayyid Ibrohim Utara',
      alamatInstansi: 'Sekretariat : Komplek Doktren Al Kahfi Somalangu Po Box 32 Kebumen 54317 Jawa Tengah',
      namaAdmin: 'ADMINISTRATOR',
      jabatanAdmin: 'Sekretaris',
      logo: null
    };
  });

  const [waSettings, setWaSettings] = useState(() => {
    const saved = localStorage.getItem('myibrohim-wa-settings');
    return saved ? JSON.parse(saved) : {
      namaKasir: 'MUHAMMAD ZIDNI RAMADHANI',
      jabatan: 'BENDAHARA',
      noRekening: 'BRI 3086 0103 4428 534\nMUHAMMAD ZIDTNI RAMADHANI\n(TIDAK MENERIMA TITIP UANG SANTRI)'
    };
  });

  const [notifSettings, setNotifSettings] = useState(() => {
    const saved = localStorage.getItem('myibrohim-notif-settings');
    return saved ? JSON.parse(saved) : {
      tunggakan: true,
      anomali: true,
      sistem: true,
      email: true
    };
  });

  const [toasts, setToasts] = useState([]);

  // Fetch report settings from Supabase if possible
  const fetchReportSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('ref_settings').select('*').single();
      if (error) throw error;
      if (data) {
        const settings = {
          namaInstansi: data.nama_instansi,
          alamatInstansi: data.alamat_instansi,
          namaAdmin: data.nama_admin,
          jabatanAdmin: data.jabatan_admin,
          logo: data.logo_url
        };
        setReportSettings(settings);
        localStorage.setItem('myibrohim-report-settings', JSON.stringify(settings));

        if (data.logo_url) {
          setLogoUrl(data.logo_url);
          localStorage.setItem('myibrohim-logo', data.logo_url);
        }

        if (data.wa_settings) {
          setWaSettings(data.wa_settings);
          localStorage.setItem('myibrohim-wa-settings', JSON.stringify(data.wa_settings));
        }
      }
    } catch (err) {
      console.warn('Gagal mengambil pengaturan dari database, menggunakan data lokal.');
    }
  }, []);

  const updateReportSettings = useCallback(async (newSettings) => {
    setReportSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('myibrohim-report-settings', JSON.stringify(updated));
      return updated;
    });

    try {
      const { error } = await supabase.from('ref_settings').upsert({
        id: 1, // Assume single row
        nama_instansi: newSettings.namaInstansi,
        alamat_instansi: newSettings.alamatInstansi,
        nama_admin: newSettings.namaAdmin,
        jabatan_admin: newSettings.jabatanAdmin,
        logo_url: newSettings.logo,
        updated_at: new Date()
      });
      if (error) throw error;
    } catch (err) {
      console.error('Gagal sinkronisasi database:', err.message);
    }
  }, []);

  const updateWaSettings = useCallback(async (newSettings) => {
    setWaSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('myibrohim-wa-settings', JSON.stringify(updated));
      return updated;
    });

    try {
      const { error } = await supabase.from('ref_settings').upsert({
        id: 1,
        wa_settings: newSettings,
        updated_at: new Date()
      });
      if (error) throw error;
    } catch (err) {
      console.error('Gagal sinkronisasi database WA:', err.message);
    }
  }, []);

  const updateNotifSettings = useCallback(async (newSettings) => {
    setNotifSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('myibrohim-notif-settings', JSON.stringify(updated));
      return updated;
    });

    try {
      const { error } = await supabase.from('ref_settings').upsert({
        id: 1,
        notif_settings: newSettings,
        updated_at: new Date()
      });
      if (error) throw error;
    } catch (err) {
      console.error('Gagal sinkronisasi notifikasi ke database:', err.message);
    }
  }, []);

  const updateLogo = useCallback(async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const dataUrl = e.target.result;
          
          // Simpan ke Database
          const { error } = await supabase.from('ref_settings').upsert({
            id: 1,
            logo_url: dataUrl,
            updated_at: new Date()
          });
          
          if (error) throw error;
          
          setLogoUrl(dataUrl);
          localStorage.setItem('myibrohim-logo', dataUrl);
          resolve(dataUrl);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Gagal membaca file'));
      reader.readAsDataURL(file);
    });
  }, []);

  const resetLogo = useCallback(async () => {
    try {
      await supabase.from('ref_settings').upsert({
        id: 1,
        logo_url: null,
        updated_at: new Date()
      });
      setLogoUrl(logoDefault);
      localStorage.removeItem('myibrohim-logo');
    } catch (err) {
      console.error('Gagal reset logo:', err.message);
    }
  }, []);

  const addToast = useCallback((message, type = 'success', duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  return (
    <AppContext.Provider value={{
      logoUrl, updateLogo, resetLogo,
      user, authLoading, login, logout, updateProfile, updatePassword,
      reportSettings, updateReportSettings, fetchReportSettings,
      waSettings, updateWaSettings,
      notifSettings, updateNotifSettings,
      toasts, addToast
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
