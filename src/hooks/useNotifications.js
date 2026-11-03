import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useApp } from '../context/AppContext';

export function useNotifications() {
  const { notifSettings } = useApp();
  const [notifications, setNotifications] = useState([]);
  const [readIds, setReadIds] = useState(() => {
    try {
      const saved = localStorage.getItem('myibrohim-notif-reads');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      let newNotifs = [];
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth(); // 0-11
      const today = new Date();
      
      // Prepare queries based on settings
      const promises = {};

      if (notifSettings.tunggakan) {
        promises.nominal = supabase
          .from('nominal_santri')
          .select('santri_id, jenis_bayar, nominal')
          .eq('tahun', currentYear);
          
        promises.payments = supabase
          .from('transaksi_pemasukan')
          .select('santri_id, jenis_bayar, nominal')
          .eq('tahun_bayar', currentYear);
      }

      if (notifSettings.anomali) {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 7);
        promises.expenses = supabase
          .from('transaksi_pengeluaran')
          .select('id, deskripsi, nominal, created_at')
          .gte('created_at', sevenDaysAgo.toISOString())
          .gte('nominal', 1000000)
          .order('created_at', { ascending: false });
      }

      if (notifSettings.sistem) {
        if (currentMonth >= 4 && currentMonth <= 6) {
          promises.nextYearNominalCount = supabase
            .from('nominal_santri')
            .select('id', { count: 'exact', head: true })
            .eq('tahun', currentYear + 1);
        }
        promises.santriCount = supabase
          .from('databasesantri')
          .select('id', { count: 'exact', head: true })
          .eq('is_deleted', false);
      }

      // Execute all promises concurrently
      const keys = Object.keys(promises);
      if (keys.length === 0) {
        setNotifications([]);
        setLoading(false);
        return;
      }

      const results = await Promise.all(Object.values(promises));
      const dataMap = keys.reduce((acc, key, index) => {
        acc[key] = results[index];
        return acc;
      }, {});

      // 1. Tunggakan Alerts
      if (notifSettings.tunggakan && dataMap.nominal?.data && dataMap.payments?.data) {
        const nominalData = dataMap.nominal.data;
        const paymentData = dataMap.payments.data;

        if (nominalData.length > 0) {
          const paymentsMap = {};
          paymentData.forEach(p => {
            const key = `${p.santri_id}-${p.jenis_bayar}`;
            paymentsMap[key] = (paymentsMap[key] || 0) + Number(p.nominal || 0);
          });

          let unpaidTotal = 0;
          const unpaidSet = new Set();

          nominalData.forEach(n => {
            const key = `${n.santri_id}-${n.jenis_bayar}`;
            const paid = paymentsMap[key] || 0;
            const target = Number(n.nominal || 0);
            if (target > 0 && paid < target) {
              unpaidSet.add(n.santri_id);
              unpaidTotal += (target - paid);
            }
          });

          if (unpaidTotal > 0) {
            newNotifs.push({
              id: `arrears-${currentYear}-${currentMonth}`,
              type: 'tunggakan',
              title: 'Peringatan Tunggakan',
              message: `Masih ada ${unpaidSet.size} santri dengan total tagihan Rp ${unpaidTotal.toLocaleString('id-ID')} yang belum lunas.`,
              date: new Date().toISOString(),
              actionUrl: '/unpaid'
            });
          }
        }
      }

      // 2. Anomali Pengeluaran
      if (notifSettings.anomali && dataMap.expenses?.data) {
        dataMap.expenses.data.forEach(exp => {
          newNotifs.push({
            id: `expense-${exp.id}`,
            type: 'anomali',
            title: 'Pengeluaran Besar',
            message: `Tercatat pengeluaran sebesar Rp ${Number(exp.nominal).toLocaleString('id-ID')} untuk "${exp.deskripsi}".`,
            date: exp.created_at,
            actionUrl: '/transactions'
          });
        });
      }

      // 3. System Reminders
      if (notifSettings.sistem) {
        if (dataMap.nextYearNominalCount?.count === 0) {
          newNotifs.push({
            id: `system-nominal-${currentYear + 1}`,
            type: 'sistem',
            title: 'Pengaturan Tahun Ajaran Baru',
            message: `Bulan ajaran baru segera tiba. Anda belum mengatur nominal tagihan untuk tahun ${currentYear + 1}.`,
            date: new Date().toISOString(),
            actionUrl: '/settings'
          });
        }
        
        if (dataMap.santriCount?.count === 0) {
           newNotifs.push({
             id: `system-no-santri`,
             type: 'sistem',
             title: 'Database Kosong',
             message: `Anda belum memiliki data santri. Silakan tambahkan data santri terlebih dahulu.`,
             date: new Date().toISOString(),
             actionUrl: '/santri'
           });
        }
      }

      // Sort notifications by date descending
      newNotifs.sort((a, b) => new Date(b.date) - new Date(a.date));
      setNotifications(newNotifs);

    } catch (err) {
      console.error('[useNotifications] Error fetching:', err);
    } finally {
      setLoading(false);
    }
  }, [notifSettings]);

  useEffect(() => {
    // Delay initial fetch by 3 seconds to avoid blocking main page network requests
    const initialDelay = setTimeout(() => {
      fetchNotifications();
    }, 3000);

    // Refresh notifications every 15 mins
    const interval = setInterval(fetchNotifications, 15 * 60 * 1000);

    return () => {
      clearTimeout(initialDelay);
      clearInterval(interval);
    };
  }, [fetchNotifications]);

  const markAsRead = (id) => {
    setReadIds(prev => {
      if (!prev.includes(id)) {
        const updated = [...prev, id];
        localStorage.setItem('myibrohim-notif-reads', JSON.stringify(updated));
        return updated;
      }
      return prev;
    });
  };

  const markAllAsRead = () => {
    const allIds = notifications.map(n => n.id);
    const updated = [...new Set([...readIds, ...allIds])];
    setReadIds(updated);
    localStorage.setItem('myibrohim-notif-reads', JSON.stringify(updated));
  };

  const unreadCount = notifications.filter(n => !readIds.includes(n.id)).length;

  return {
    notifications,
    readIds,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications
  };
}
