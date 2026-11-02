import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useApp } from '../context/AppContext';
import { Edit2, ShieldAlert, CheckCircle, XCircle, Search, PowerOff, Power, Check } from 'lucide-react';
import Table from '../components/ui/Table';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import ConfirmPopup from '../components/ui/ConfirmPopup';
import './UsersManagement.css';

const AVAILABLE_PERMISSIONS = [
  { id: 'dashboard', label: 'Dashboard Utama' },
  { id: 'santri', label: 'Data Santri' },
  { id: 'transactions', label: 'Transaksi' },
  { id: 'unpaid', label: 'Tagihan' },
  { id: 'reports', label: 'Laporan' },
  { id: 'settings', label: 'Pengaturan' }
];

export default function UsersManagement() {
  const { user, addToast } = useApp();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [editUser, setEditUser] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editFormData, setEditFormData] = useState({ role: '', permissions: [] });
  
  const [suspendUser, setSuspendUser] = useState(null);
  const [suspendLoading, setSuspendLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users_profile')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      addToast('Gagal memuat data pengguna: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (u) => {
    setEditUser(u);
    setEditFormData({
      role: u.role || 'Pengurus',
      permissions: u.permissions || []
    });
  };

  const handleTogglePermission = (permId) => {
    setEditFormData(prev => {
      const perms = prev.permissions;
      if (perms.includes(permId)) {
        return { ...prev, permissions: perms.filter(p => p !== permId) };
      } else {
        return { ...prev, permissions: [...perms, permId] };
      }
    });
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    setEditSaving(true);
    try {
      const { error } = await supabase
        .from('users_profile')
        .update({
          role: editFormData.role,
          permissions: editFormData.permissions
        })
        .eq('id', editUser.id);
        
      if (error) throw error;
      addToast('Hak akses berhasil diperbarui!', 'success');
      setEditUser(null);
      fetchUsers();
    } catch (err) {
      addToast('Gagal memperbarui pengguna: ' + err.message, 'error');
    } finally {
      setEditSaving(false);
    }
  };

  const handleToggleSuspend = async () => {
    if (!suspendUser) return;
    setSuspendLoading(true);
    const newStatus = !suspendUser.is_active;
    try {
      const { error } = await supabase
        .from('users_profile')
        .update({ is_active: newStatus })
        .eq('id', suspendUser.id);
        
      if (error) throw error;
      
      addToast(`Akun berhasil ${newStatus ? 'diaktifkan' : 'dinonaktifkan'}!`, 'success');
      setSuspendUser(null);
      fetchUsers();
    } catch (err) {
      addToast('Gagal mengubah status: ' + err.message, 'error');
    } finally {
      setSuspendLoading(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.nama?.toLowerCase().includes(search.toLowerCase()) || 
    u.role?.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    { 
      key: 'nama', 
      label: 'Pengguna', 
      render: (v, item) => (
        <div>
          <div className="font-semibold">{v || 'Tanpa Nama'}</div>
          {item.id === user?.id && <span style={{ fontSize: '0.7rem', color: 'var(--primary-color)' }}>(Anda saat ini)</span>}
        </div>
      ) 
    },
    { 
      key: 'role', 
      label: 'Jabatan/Role', 
      render: (v) => <Badge variant={v === 'Administrator' ? 'badge--blue' : 'badge--neutral'}>{v}</Badge> 
    },
    { 
      key: 'is_active', 
      label: 'Status Akses', 
      render: (v) => (
        <Badge variant={v ? 'badge--green' : 'badge--red'}>
          {v ? 'Aktif' : 'Suspended'}
        </Badge>
      ) 
    },
    { 
      key: 'last_login_at', 
      label: 'Terakhir Aktif', 
      render: (v) => v ? new Date(v).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : 'Belum Pernah Login' 
    }
  ];

  const renderActions = (row) => (
    <div className="table-actions">
      <button 
        className="table-actions__btn table-actions__btn--edit" 
        title="Edit Hak Akses" 
        onClick={() => handleEditClick(row)}
      >
        <Edit2 size={16} />
      </button>
      {row.id !== user?.id && (
        <button 
          className={`table-actions__btn ${row.is_active ? 'table-actions__btn--delete' : 'table-actions__btn--edit'}`} 
          title={row.is_active ? 'Cabut Akses' : 'Pulihkan Akses'} 
          onClick={() => setSuspendUser(row)}
        >
          {row.is_active ? <PowerOff size={16} /> : <Power size={16} />}
        </button>
      )}
    </div>
  );

  if (user?.role !== 'Administrator') {
    return (
      <div className="animate-fade-in" style={{ padding: '2rem', textAlign: 'center' }}>
        <ShieldAlert size={48} style={{ color: 'var(--danger-color)', margin: '0 auto 1rem' }} />
        <h2>Akses Ditolak</h2>
        <p>Anda tidak memiliki izin untuk membuka halaman Manajemen Pengguna.</p>
      </div>
    );
  }

  return (
    <div className="users-management animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Manajemen Pengguna</h1>
          <p className="page-subtitle">Kelola akun, role, dan hak akses aplikasi</p>
        </div>
      </div>

      <div className="card card--padded users-management__header">
        <div className="users-management__search">
          <Input
            placeholder="Cari nama atau role..."
            icon={Search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="card shadow-md">
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Memuat daftar pengguna...</p>
          </div>
        ) : (
          <Table
            columns={columns}
            data={filteredUsers}
            actions={renderActions}
          />
        )}
      </div>

      {/* Modal Edit Hak Akses */}
      <Modal
        isOpen={!!editUser}
        onClose={() => setEditUser(null)}
        title="Edit Hak Akses Pengguna"
        maxWidth="500px"
      >
        {editUser && (
          <div className="edit-form">
            <div className="edit-form__group">
              <label className="edit-form__label">Role Utama</label>
              <input 
                type="text" 
                className="edit-form__input"
                value={editFormData.role}
                onChange={(e) => setEditFormData(prev => ({ ...prev, role: e.target.value }))}
                placeholder="Contoh: Bendahara, Pembina, Kasir..."
              />
              <p className="edit-form__help">Role utama hanya sebagai label jabatan di sistem.</p>
            </div>

            <div className="edit-form__group" style={{ marginTop: '1.5rem' }}>
              <label className="edit-form__label">Hak Akses Menu Khusus</label>
              <div className="permissions-grid">
                {AVAILABLE_PERMISSIONS.map(perm => {
                  const isChecked = editFormData.permissions.includes(perm.id);
                  return (
                    <label key={perm.id} className={`permission-card ${isChecked ? 'active' : ''}`}>
                      <input 
                        type="checkbox" 
                        checked={isChecked}
                        onChange={() => handleTogglePermission(perm.id)}
                      />
                      <div className="permission-card__indicator">
                        {isChecked && <Check size={12} strokeWidth={3} />}
                      </div>
                      <span className="permission-card__label">{perm.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="edit-form__footer" style={{ marginTop: '2rem' }}>
              <Button variant="ghost" onClick={() => setEditUser(null)}>Batal</Button>
              <Button onClick={handleSaveEdit} disabled={editSaving}>
                {editSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm Suspend */}
      <ConfirmPopup
        isOpen={!!suspendUser}
        onCancel={() => setSuspendUser(null)}
        onConfirm={handleToggleSuspend}
        title={suspendUser?.is_active ? 'Cabut Akses Pengguna?' : 'Pulihkan Akses Pengguna?'}
        message={
          suspendUser?.is_active 
            ? `Apakah Anda yakin ingin menonaktifkan akun ${suspendUser?.nama}? Mereka akan otomatis logout dan tidak bisa login kembali.` 
            : `Apakah Anda yakin ingin mengaktifkan kembali akun ${suspendUser?.nama}? Mereka akan bisa login dan menggunakan aplikasi lagi.`
        }
        confirmText={suspendLoading ? 'Memproses...' : (suspendUser?.is_active ? 'Ya, Cabut Akses' : 'Ya, Aktifkan')}
        confirmVariant={suspendUser?.is_active ? 'danger' : 'primary'}
      />
    </div>
  );
}
