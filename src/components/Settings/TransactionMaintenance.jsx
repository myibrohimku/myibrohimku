import React, { useState } from 'react';
import { Trash2, Download, AlertTriangle, ShieldCheck, Database, ChevronDown } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Input from '../ui/Input';
import Dropdown from '../ui/Dropdown';
import ConfirmPopup from '../ui/ConfirmPopup';
import { supabase } from '../../lib/supabaseClient';
import { generateCombinedTransactionExcel } from '../../lib/reportGenerator';
import { useApp } from '../../context/AppContext';
import { useMasterTransaksi } from '../../hooks/useMasterTransaksi';
import './TransactionMaintenance.css';

export default function TransactionMaintenance() {
  const { addToast, reportSettings } = useApp();
  const { jenisBayar, kasirList, urgensiList, sumberDanaList } = useMasterTransaksi();
  
  const [target, setTarget] = useState('all'); // 'income', 'outcome', 'all'
  const [range, setRange] = useState('month'); // 'day', 'week', 'month', 'year', 'all'
  const [verificationText, setVerificationText] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasBackedUp, setHasBackedUp] = useState(false);

  const handleBackup = async () => {
    try {
      addToast('Menyiapkan file backup...', 'info');
      
      const fetchAll = async () => {
        const results = {};
        if (target === 'income' || target === 'all') {
          const { data } = await supabase.from('transaksi_pemasukan').select('*, databasesantri(nama, nia)');
          results.income = data || [];
        }
        if (target === 'outcome' || target === 'all') {
          const { data } = await supabase.from('transaksi_pengeluaran').select('*');
          results.outcome = data || [];
        }
        return results;
      };

      const { income, outcome } = await fetchAll();
      const exportSettings = { 
        ...reportSettings, 
        masterData: { jenisBayar, kasirList, urgensiList, sumberDanaList } 
      };
      
      if ((!income || income.length === 0) && (!outcome || outcome.length === 0)) {
        addToast('Tidak ada data untuk dibackup', 'warning');
        return;
      }

      generateCombinedTransactionExcel(income, outcome, exportSettings);

      setHasBackedUp(true);
      addToast('Backup berhasil diunduh. Silakan simpan file tersebut.', 'success');
    } catch (err) {
      addToast('Gagal membuat backup: ' + err.message, 'error');
    }
  };

  const getThresholdDate = () => {
    const now = new Date();
    if (range === 'day') return new Date(now.setDate(now.getDate() - 1)).toISOString();
    if (range === 'week') return new Date(now.setDate(now.getDate() - 7)).toISOString();
    if (range === 'month') return new Date(now.setMonth(now.getMonth() - 1)).toISOString();
    if (range === 'year') return new Date(now.setFullYear(now.getFullYear() - 1)).toISOString();
    return null; // all time
  };

  const handleExecute = async () => {
    if (verificationText !== 'HAPUS') {
      addToast('Teks verifikasi salah', 'error');
      return;
    }

    if (!hasBackedUp) {
      const confirm = window.confirm("Anda belum melakukan backup di sesi ini. Lanjutkan penghapusan?");
      if (!confirm) return;
    }

    setIsDeleting(true);
    try {
      const threshold = getThresholdDate();
      
      const doDelete = async (table) => {
        let query = supabase.from(table).delete();
        if (threshold) {
          query = query.gte('created_at', threshold); // User said "rentang waktu mulai dari hari..." usually means "this period"
          // Wait, if user says "hapus pemasukan... rentang waktu hari, minggu, bulan"
          // It could mean: 
          // 1. Hapus data yang ada di rentang tersebut (Data BARU) -> mistake correction
          // 2. Hapus data di LUAR rentang tersebut (Data LAMA) -> maintenance
          // User said "sampah-sampah percobaan", usually experimental data is the RECENT data.
          // BUT usually maintenance means clearing OLD data.
          // Let's provide clear labels: "Hapus Data [Rentang] Terakhir"
        } else {
          query = query.neq('id', 0); // Delete all
        }
        const { error } = await query;
        if (error) throw error;
      };

      if (target === 'income' || target === 'all') await doDelete('transaksi_pemasukan');
      if (target === 'outcome' || target === 'all') await doDelete('transaksi_pengeluaran');

      addToast('Data berhasil dibersihkan', 'success');
      setVerificationText('');
      setHasBackedUp(false);
      setIsConfirmOpen(false);
    } catch (err) {
      addToast('Gagal menghapus data: ' + err.message, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="transaction-maintenance animate-fade-in">
      <div className="maintenance-header">
        <Database size={24} className="text-red-500" />
        <div>
          <h3 className="maintenance-title">Pemeliharaan Data Transaksi</h3>
          <p className="maintenance-desc">Bersihkan data percobaan atau data lama secara massal.</p>
        </div>
      </div>

      <div className="maintenance-card card">
        <div className="maintenance-warning-box">
          <AlertTriangle size={20} />
          <div>
            <strong>Peringatan Penting:</strong>
            <p>Tindakan ini bersifat permanen. Sangat disarankan untuk mengunduh backup Excel terlebih dahulu sebagai arsip.</p>
          </div>
        </div>

        <div className="maintenance-step">
          <div className="step-number">1</div>
          <div className="step-content">
            <h4>Unduh Cadangan (Backup)</h4>
            <p className="text-secondary">Simpan seluruh data saat ini ke format Excel yang rapi.</p>
            <div className="backup-action-group">
              <Button 
                variant={hasBackedUp ? 'outline' : 'primary'} 
                icon={Download} 
                onClick={handleBackup}
              >
                {hasBackedUp ? 'Backup Lagi' : 'Unduh Backup Sekarang'}
              </Button>
              {hasBackedUp && <Badge variant="success">Sudah Diunduh</Badge>}
            </div>
          </div>
        </div>

        <div className="maintenance-step">
          <div className="step-number">2</div>
          <div className="step-content">
            <h4>Konfigurasi Penghapusan</h4>
            
            <div className="config-grid">
              <div className="config-item">
                <label>Tipe Data:</label>
                <Dropdown 
                  options={[
                    { value: 'all', label: 'Semua (Pemasukan & Pengeluaran)' },
                    { value: 'income', label: 'Hanya Pemasukan' },
                    { value: 'outcome', label: 'Hanya Pengeluaran' }
                  ]}
                  value={target}
                  onChange={setTarget}
                />
              </div>
              <div className="config-item">
                <label>Rentang Waktu:</label>
                <Dropdown 
                  options={[
                    { value: 'day', label: '24 Jam Terakhir' },
                    { value: 'week', label: '7 Hari Terakhir' },
                    { value: 'month', label: '30 Hari Terakhir' },
                    { value: 'year', label: '1 Tahun Terakhir' },
                    { value: 'all', label: 'Seluruh Data (Kosongkan Total)' }
                  ]}
                  value={range}
                  onChange={setRange}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="maintenance-step">
          <div className="step-number">3</div>
          <div className="step-content">
            <h4>Verifikasi Akhir</h4>
            <p className="text-secondary mb-3">Ketik kata <strong>HAPUS</strong> di bawah ini untuk mengaktifkan tombol eksekusi.</p>
            <div className="verification-wrapper">
              <Input 
                placeholder="Ketik 'HAPUS' di sini..." 
                value={verificationText}
                onChange={(e) => setVerificationText(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="maintenance-footer">
          <Button 
            variant="danger" 
            icon={Trash2} 
            className="w-full"
            disabled={verificationText !== 'HAPUS' || isDeleting}
            onClick={() => setIsConfirmOpen(true)}
          >
            {isDeleting ? 'Sedang Memproses...' : 'Eksekusi Pembersihan Data'}
          </Button>
        </div>
      </div>

      <ConfirmPopup 
        isOpen={isConfirmOpen}
        onCancel={() => setIsConfirmOpen(false)}
        onConfirm={handleExecute}
        title="Konfirmasi Penghapusan Masal"
        message={`Apakah Anda yakin ingin menghapus data ${target === 'all' ? 'Pemasukan & Pengeluaran' : target} dalam rentang ${range} terakhir?`}
        confirmText="Ya, Hapus Sekarang"
      />
    </div>
  );
}
