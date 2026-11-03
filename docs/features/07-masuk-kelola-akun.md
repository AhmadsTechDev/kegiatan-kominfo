# Masuk & Kelola Akun

Setiap pegawai punya akun sendiri sehingga catatan kegiatan tidak tertukar.

## Spesifikasi

### Tujuan
Menyediakan akun pegawai yang aman dan terkelola agar setiap orang masuk dengan identitasnya sendiri, catatan kegiatan tidak tertukar, dan hak akses sesuai perannya.

### Selesai bila
- Pengguna tidak bisa membuka data kegiatan sebelum berhasil masuk dengan akun kantor.
- Setelah masuk, nama pengguna dan perannya terlihat jelas di aplikasi.
- Admin dapat mengatur peran pengguna sebagai pegawai, pimpinan, atau admin, dan akses menu menyesuaikan peran tersebut.
- Setiap pengguna dapat memperbarui nama dan info kontaknya sendiri.
- Perubahan profil langsung tampil pada identitas pengguna di aplikasi.

## Sub-fitur: Masuk Akun

Login dengan akun kantor untuk membuka aplikasi.

### Tujuan
Memungkinkan pegawai membuka aplikasi dengan akun kantor agar hanya pengguna berhak yang dapat mengakses data kegiatan.

### Selesai bila
- Halaman masuk menyediakan isian akun kantor dan kata sandi.
- Bila akun atau kata sandi salah, muncul pesan jelas dan pengguna tetap berada di luar aplikasi.
- Bila berhasil masuk, pengguna diarahkan ke halaman utama dan melihat identitasnya sendiri.
- Tersedia tombol keluar untuk mengakhiri sesi dengan aman.

## Sub-fitur: Kelola Pengguna & Peran

Atur siapa saja yang boleh mencatat, melihat, dan memantau.

### Tujuan
Memungkinkan admin mengatur pengguna dan perannya agar setiap pegawai hanya bisa mencatat, melihat, atau memantau sesuai kewenangannya.

### Selesai bila
- Admin melihat daftar pengguna beserta nama, akun, peran, dan bidangnya.
- Admin dapat menambah pengguna baru serta mengubah peran pengguna yang sudah ada.
- Hak akses menu berbeda sesuai peran: pegawai dapat mencatat kegiatan, pimpinan dapat memantau, dan admin dapat mengelola akun.
- Pengguna tanpa peran admin tidak dapat membuka pengaturan pengguna dan peran.

## Sub-fitur: Atur Profil

Perbarui nama dan info kontak pemilik akun.

### Tujuan
Memungkinkan setiap pemilik akun memperbarui data dirinya agar identitas pada catatan kegiatan selalu akurat.

### Selesai bila
- Halaman profil menampilkan nama dan info kontak yang tersimpan saat ini.
- Pengguna dapat mengubah nama dan info kontak lalu menyimpannya.
- Setelah disimpan, muncul konfirmasi bahwa profil berhasil diperbarui.
- Perubahan profil langsung tercermin pada identitas pengguna di aplikasi.

## Task

### 1. Buat halaman masuk dengan form akun

### 2. Tampilkan identitas pengguna dan tombol keluar

### 3. Buat menu navigasi menyesuaikan peran

### 4. Buat halaman daftar pengguna dan peran

### 5. Buat form tambah dan ubah peran pengguna

### 6. Buat halaman atur profil dengan konfirmasi

### 7. Buat tabel pengguna dan migrasi

### 8. Buat endpoint login dan manajemen sesi

### 9. Buat middleware proteksi route kegiatan

### 10. Buat endpoint keluar akhiri sesi

### 11. Buat endpoint daftar tambah ubah peran

### 12. Buat endpoint perbarui profil pengguna

### 13. Terapkan kontrol akses berbasis peran
