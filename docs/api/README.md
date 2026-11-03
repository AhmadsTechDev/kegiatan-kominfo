# Dokumentasi API

API REST Aplikasi Pendataan Kegiatan (Bun, Elysia, Prisma, Better Auth). Alamat dasarnya `/api`. Di produksi, frontend meneruskan `/api/*` ke backend, jadi pemanggilnya cukup memakai alamat frontend.

Kembali ke [README utama](../../README.md). Diagram alurnya ada di [UML](../uml/README.md).

## Berkas

| Berkas | Isi |
| --- | --- |
| [api-auth.md](api-auth.md) | Login, aktivasi akun, lupa dan atur ulang sandi, verifikasi email baru, dan akun sendiri (`/api/me`: profil, foto, email, sandi, sesi, preferensi) |
| [api-kegiatan.md](api-kegiatan.md) | Referensi pilihan formulir, kegiatan (catat, ubah, batalkan, periksa, hapus), draf kegiatan, dan dokumentasi foto/PDF |
| [api-laporan.md](api-laporan.md) | Dashboard, kalender, rekap, pantau pemeriksaan, dan ekspor PDF |
| [api-admin.md](api-admin.md) | Data master (bidang dan sub bidang, pegawai, jenis kegiatan), manajemen akun, undangan, permintaan akun, dan audit log |

## Aturan umum

| Hal | Aturan |
| --- | --- |
| Autentikasi | Cookie sesi dari login email dan sandi (Better Auth). Tanpa cookie: 401 |
| Hak akses | Dicek di backend pada setiap permintaan. Kegiatan di luar lingkup baca dijawab 404, bukan 403, agar keberadaannya tidak bocor |
| CSRF | Permintaan yang mengubah data (`POST`, `PATCH`, `PUT`, `DELETE`) wajib membawa `Origin` (atau `Referer`) dari frontend. Selain itu 403 `ASAL_DITOLAK` |
| Format galat | `{ "code": "...", "message": "...", "details": [{ "field": "...", "message": "..." }] }` |
| Pengubahan bersamaan | Ubah kegiatan memakai `expectedUpdatedAt`; bila sudah diubah orang lain, dijawab 409 |
| Batas laju | Login dibatasi 30 percobaan per menit per IP; akun terkunci 15 menit setelah 5 kali salah sandi; ekspor PDF maksimal 10 per menit per akun |
| Audit | Setiap perubahan data dicatat ke audit log dalam transaksi yang sama |

## Peran dan hak akses

| Peran | Lingkup baca kegiatan | Tindakan |
| --- | --- | --- |
| `PEGAWAI` | Kegiatan bidangnya (termasuk sub bidang) dan kegiatan miliknya | Satu-satunya peran yang menulis kegiatan: catat dan ubah kegiatan miliknya, draf, unggah dokumentasi, isi hasil |
| `PIMPINAN` | Seluruh dinas | Membaca, memeriksa kegiatan, dan memberi catatan perbaikan. Tidak mengubah data kegiatan |
| `ADMIN` | Seluruh dinas | Membaca dan memeriksa kegiatan, ditambah master data, akun, permintaan akun, dan audit log. Tidak menulis kegiatan (403) |

## Ringkasan endpoint

Kolom **Akses**: *Login* berarti semua peran yang sudah masuk. Rincian header, body, dan respons ada di berkas masing-masing.

### Autentikasi dan akun sendiri ([api-auth.md](api-auth.md))

| Metode dan jalur | Fungsi | Akses |
| --- | --- | --- |
| `POST /api/auth/sign-in/email` | Login | Publik |
| `POST /api/auth/sign-out` | Keluar | Login |
| `GET /api/auth/get-session` | Sesi aktif saat ini | Login |
| `GET`, `POST /api/aktivasi` | Cek tautan, lalu buat sandi pertama | Publik (token) |
| `POST /api/lupa-sandi` | Minta tautan atur ulang sandi | Publik |
| `GET`, `POST /api/reset-sandi` | Cek tautan, lalu atur sandi baru | Publik (token) |
| `POST /api/konfirmasi-email` | Verifikasi email baru | Publik (token) |
| `POST /api/permintaan-akun` | Ajukan permintaan akun | Publik |
| `GET`, `PATCH /api/me` | Profil dan kontak sendiri | Login |
| `POST`, `DELETE /api/me/foto`, `GET /api/me/foto/:userId` | Foto profil | Login |
| `PATCH`, `DELETE /api/me/email` | Ajukan atau batalkan ganti email | Login |
| `PATCH /api/me/sandi` | Ganti sandi | Login |
| `GET`, `DELETE /api/me/sesi`, `DELETE /api/me/sesi/:id` | Lihat dan cabut sesi (satu atau semua perangkat lain) | Login |
| `GET`, `PATCH /api/me/preferensi` | Tema dan notifikasi | Login |

### Kegiatan, draf, dan dokumentasi ([api-kegiatan.md](api-kegiatan.md))

| Metode dan jalur | Fungsi | Akses |
| --- | --- | --- |
| `GET /api/referensi` | Pilihan formulir (jenis, bidang, pegawai) | Login |
| `GET /api/kegiatan`, `GET /api/kegiatan/:id` | Daftar dengan filter dan detail | Login (sesuai lingkup baca) |
| `POST /api/kegiatan` | Catat kegiatan | `PEGAWAI` |
| `PATCH /api/kegiatan/:id` | Ubah dan isi hasil | `PEGAWAI` (pemilik) |
| `POST /api/kegiatan/:id/selesai` | Selesaikan kegiatan yang sedang berlangsung (waktu selesai menjadi sekarang) | `PEGAWAI` (pemilik) |
| `POST /api/kegiatan/:id/batalkan` | Batalkan (alasan wajib) | `PEGAWAI` (pemilik) |
| `POST /api/kegiatan/:id/pemeriksaan` | Tandai sudah diperiksa atau perlu perbaikan | `PIMPINAN`, `ADMIN` |
| `DELETE /api/kegiatan/:id` | Hapus kegiatan | `PEGAWAI` (pemilik) |
| `GET`, `POST /api/draf-kegiatan`, `GET`, `PUT`, `DELETE /api/draf-kegiatan/:id` | Draf milik sendiri | `PEGAWAI` |
| `POST /api/kegiatan/:id/dokumentasi` | Unggah foto atau PDF (maks. 20 MB, 10 berkas per kegiatan) | `PEGAWAI` (pemilik) |
| `GET /api/dokumentasi/:id` | Unduh atau lihat berkas | Login (sesuai lingkup baca) |
| `PUT`, `DELETE /api/dokumentasi/:id` | Ganti atau hapus berkas | `PEGAWAI` (pemilik) |

### Dashboard, kalender, rekap, pantau, ekspor ([api-laporan.md](api-laporan.md))

| Metode dan jalur | Fungsi | Akses |
| --- | --- | --- |
| `GET /api/dashboard` | Dashboard dinas | `PIMPINAN`, `ADMIN` |
| `GET /api/dashboard/saya` | Dashboard tugas pribadi | Login |
| `GET /api/kalender` | Kegiatan per bulan | Login (sesuai lingkup baca) |
| `GET /api/rekap` | Rekap jumlah per unit induk dan jenis | Login (sesuai lingkup baca) |
| `GET /api/pantau/ringkasan` | Ringkasan status pemeriksaan | `PIMPINAN`, `ADMIN` |
| `GET /api/ekspor/kegiatan.pdf`, `GET /api/ekspor/pratinjau` | Ekspor PDF berkop dinas dan jumlah barisnya | Login (sesuai lingkup baca) |

### Administrasi ([api-admin.md](api-admin.md)), semuanya `ADMIN`

| Metode dan jalur | Fungsi |
| --- | --- |
| `GET`, `POST /api/admin/bidang`, `PATCH`, `DELETE /api/admin/bidang/:id` | Bidang dan sub bidang (hapus hanya bila belum dipakai) |
| `GET`, `POST /api/admin/pegawai`, `PATCH`, `DELETE /api/admin/pegawai/:id` | Data kepegawaian (hapus hanya yang belum punya akun dan belum dipakai) |
| `GET`, `POST /api/admin/jenis-kegiatan`, `PATCH /api/admin/jenis-kegiatan/:id` | Jenis kegiatan |
| `GET`, `POST /api/admin/akun`, `GET`, `PATCH`, `DELETE /api/admin/akun/:id` | Daftar, buat, detail, ubah, dan hapus akun |
| `POST /api/admin/akun/:id/nonaktifkan`, `.../aktifkan` | Nonaktifkan dan aktifkan akun |
| `POST /api/admin/akun/:id/kirim-ulang-undangan`, `.../reset-sandi`, `.../cabut-sesi` | Kirim ulang undangan, kirim tautan atur ulang sandi, cabut semua sesi |
| `POST /api/admin/pegawai/:id/undang` | Undang pegawai yang sudah ada |
| `GET /api/admin/permintaan-akun`, `.../jumlah` | Daftar dan jumlah permintaan akun |
| `POST /api/admin/permintaan-akun/:id/setujui`, `.../tolak` | Setujui atau tolak permintaan |
| `GET /api/audit-log`, `GET /api/audit-log/pilihan`, `GET /api/audit-log/:id` | Audit log dengan filter dan nilai sebelum/sesudah |

### Notifikasi (semua role, hanya milik sendiri)

| Metode dan jalur | Fungsi | Akses |
| --- | --- | --- |
| `GET /api/notifikasi` | 20 notifikasi terbaru (`id`, `jenis` = `diperiksa` atau `perlu_perbaikan`, `judul`, `isi` = catatan pemeriksa, `kegiatanId`, `dibacaAt`, `createdAt`) dan jumlah `belumDibaca` | Login |
| `POST /api/notifikasi/:id/baca` | Tandai satu notifikasi dibaca; balasan `{ "jumlah": 0 }` bila bukan milik sendiri | Login |
| `POST /api/notifikasi/baca-semua` | Tandai semua notifikasi sendiri dibaca | Login |

Notifikasi dibuat otomatis saat `POST /api/kegiatan/:id/pemeriksaan`, untuk akun `PEGAWAI` pembuat kegiatan dan penanggung jawabnya (kecuali pemeriksa sendiri).

### Lainnya

| Metode dan jalur | Fungsi | Akses |
| --- | --- | --- |
| `GET /api/health` | Cek layanan dan koneksi database | Publik |
