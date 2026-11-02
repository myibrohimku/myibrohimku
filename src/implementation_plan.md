# Rencana Implementasi Manajemen Pengguna (RBAC)

Membuat sistem manajemen multi-user dengan kontrol hak akses, status aktif, dan pengelolaan dari dalam aplikasi.

## Jawaban Atas Pertanyaan Anda

1. **Apakah user bisa dibatasi fitur-fiturnya?**
   **BISA.** Kita menerapkan Role-Based Access Control (RBAC). Secara default: "Administrator" bisa membuka semua menu, "Bendahara" hanya Transaksi & Tagihan.
   *Jawaban untuk pertanyaan Anda tentang Pembina:* Jika Anda ingin Pembina (Wali Kamar) bisa melakukan transaksi sewaktu-waktu, kita akan menambahkan sistem **"Checklist Hak Akses Khusus"**. Jadi selain memilih Role utama, Anda bisa mencentang kotak [x] Akses Transaksi dan [x] Akses Tagihan khusus untuk akun Pembina tersebut dari halaman Manajemen Pengguna.

2. **Apakah pembatasan fitur bisa diatur langsung di halaman ini?**
   **BISA.** Di halaman "Manajemen Pengguna", saat Anda mengedit pengguna, Anda tidak hanya bisa mengubah *Role* utamanya (label), tetapi juga **mencentang menu mana saja yang boleh dia buka**. Ini memberikan fleksibilitas penuh bagi Anda sewaktu-waktu.

3. **Apakah ada log user aktif/tidak aktif?**
   **BISA.** Kita bisa melacak kapan terakhir kali user tersebut membuka aplikasi (`last_login` / `last_active_at`). Di halaman tabel manajemen pengguna akan muncul status "🟢 Aktif (Online hari ini)" atau "⚪ Tidak Aktif (Terakhir dilihat 2 minggu lalu)".

4. **Apakah saya bisa mencabut akses (Ban/Suspend)?**
   **BISA.** Di halaman manajemen, akan ada tombol toggle "Status Akses". Jika Anda mematikannya (Suspend/Cabut Akses), user tersebut otomatis akan ditendang keluar dari aplikasi (Logout paksa) dan tidak akan bisa login lagi sebelum Anda mengaktifkannya kembali.

5. **Apakah halaman Login untuk Admin dan User dibedakan?**
   **TIDAK PERLU.** Praktik terbaik standar industri (seperti Google, Facebook, dsb) adalah **1 halaman login untuk semua**. Setelah mereka memasukkan email dan password, *sistem di balik layar yang akan mengenali* apakah dia Admin atau Kasir. Jika Admin, dia diarahkan ke dashboard penuh. Jika Kasir, dia hanya melihat halaman Transaksi. Ini jauh lebih aman dan efisien.

---

## User Review Required

> [!IMPORTANT]  
> Mengelola daftar pengguna Supabase langsung dari aplikasi React membutuhkan tabel perantara (`public.profiles`) agar aman, karena secara bawaan kunci client (Anon Key) tidak diizinkan membaca seluruh daftar email pengguna untuk alasan keamanan.
> 
> **Syarat Implementasi:** Kita perlu membuat tabel `profiles` di *database Supabase Anda* untuk mencatat nama, role, dan status aktif setiap user secara terpusat. Apakah Anda bersedia untuk membuat/menyesuaikan tabel ini nanti?

## Proposed Changes

### 1. Database Layer (Supabase)
Kita perlu menjalankan *Query SQL* di dashboard Supabase Anda untuk:
- Membuat tabel `users_profile` yang berisi: `id` (link ke Auth), `nama`, `role`, `is_active`, `last_login_at`.
- Membuat *Trigger* agar setiap kali Anda membuat akun baru, otomatis datanya masuk ke tabel ini.

### 2. Context Layer
#### [MODIFY] `src/context/AppContext.jsx`
- Menambahkan pemeriksaan status `is_active`. Jika `false`, paksa fungsi `logout()`.
- Mengubah fungsi `login()` untuk ikut mencatat waktu `last_login_at`.

### 3. Halaman Baru
#### [NEW] `src/pages/UsersManagement.jsx`
- Tabel daftar pengguna.
- Tombol aksi: Edit Role, Suspend (Cabut Akses), dan Hapus Akses.
- Indikator waktu terakhir aktif.

### 4. Routing & Sidebar Layer
#### [MODIFY] `src/components/layout/Sidebar.jsx`
- Menambahkan menu "Manajemen Pengguna" yang HANYA muncul jika `user.role === 'Administrator'`.
- Menyembunyikan menu lain berdasarkan peran user saat ini.

#### [MODIFY] `src/App.jsx`
- Melindungi rute tertentu (Route Guards). Jika user dengan role 'Kasir' mencoba mengetik URL `/settings` secara manual, dia akan dialihkan ke halaman 'Akses Ditolak' atau dilempar kembali ke Beranda.

## Verification Plan

### Manual Verification
1. Login sebagai Admin Utama -> Buka Manajemen Pengguna -> Buat User Baru dengan role 'Kasir'.
2. Ubah status 'Kasir' menjadi *Suspend*.
3. Buka browser mode rahasia (Incognito) -> Login sebagai 'Kasir' -> Pastikan muncul pesan "Akun Anda dinonaktifkan".
4. Aktifkan kembali Kasir -> Login -> Pastikan Kasir tidak melihat menu 'Pengaturan' dan 'Manajemen Pengguna' di Sidebar.
