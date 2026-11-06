# PRD: Aplikasi Pendataan Kegiatan Diskominfo Kota Palembang

Dokumen kebutuhan produk, diselaraskan dengan aplikasi yang sudah berjalan. Nomor kebutuhan (FR dan NFR) dan nomor bagian dirujuk dari kode dan dokumentasi, jadi jangan diubah tanpa memperbarui rujukannya. Dokumen pendamping: [README](../README.md), [dokumentasi API](api/README.md), [spesifikasi fitur](features/README.md), [diagram UML](uml/README.md), dan [DESIGN.md](../apps/web/DESIGN.md).

## 1. Ikhtisar

**Aplikasi Pendataan Kegiatan Berbasis Website pada Dinas Komunikasi dan Informatika Kota Palembang** menggantikan pencatatan kegiatan yang selama ini tersebar di file Excel, dokumen Word, dan percakapan WhatsApp.

**Masalah yang diselesaikan**
- Data kegiatan sulit dicari kembali karena tersebar.
- Dokumentasi (foto, surat, undangan) tidak terpusat.
- Laporan memakan waktu lama karena diolah manual.
- Pimpinan tidak punya cara cepat dan terstruktur untuk memantau kegiatan.

**Tujuan**
1. Satu tempat terpusat untuk mencatat semua kegiatan.
2. Pencarian dan pengelolaan dokumentasi yang mudah.
3. Rekap dan laporan PDF otomatis, cepat, dan siap kirim.
4. Akses pantau yang rapi bagi pimpinan.

**Pemenang pertama (first win).** Pegawai berhasil **mencatat kegiatan baru** lewat satu formulir cepat, tanpa membuka Excel atau WhatsApp.

## 2. Ruang lingkup

| Termasuk | Tidak termasuk |
| --- | --- |
| Pencatatan kegiatan beserta lokasi di peta dan dokumentasi foto atau PDF | Alur persetujuan bertingkat (lihat bagian 12) |
| Rekap, dashboard, kalender, dan laporan PDF | Ekspor Excel |
| Pemeriksaan opsional oleh pimpinan | Pendaftaran akun mandiri |
| Akun, peran, master data, dan audit log | Aplikasi seluler asli (antarmuka web responsif sudah ramah ponsel) |
| Email aktivasi, atur ulang sandi, dan pengingat | Notifikasi lewat WhatsApp atau SMS |

## 3. Peran dan hak akses

| Peran | Kode | Lingkup baca kegiatan | Tindakan |
| --- | --- | --- | --- |
| Pegawai | `PEGAWAI` | Kegiatan bidangnya (termasuk sub bidang) dan kegiatan miliknya | Satu-satunya peran yang mencatat, mengubah, membatalkan, dan menghapus kegiatan (miliknya), draf, unggah dokumentasi, isi hasil; menerima notifikasi pemeriksaan |
| Pimpinan | `PIMPINAN` | Seluruh dinas | Membaca kegiatan, dokumentasi, hasil, rekap, laporan; memeriksa dan memberi catatan perbaikan |
| Admin | `ADMIN` | Seluruh dinas | Membaca dan memeriksa kegiatan (memberi catatan perbaikan), mengelola akun, permintaan akun, master data, dan audit log. Tidak menulis kegiatan |

- Pemeriksaan dan halaman Pantau untuk Pimpinan dan Admin. Status pemeriksaan terpisah dari status pelaksanaan; setiap pemeriksaan tercatat di riwayat pemeriksaan dan audit log, dan pegawai pembuat serta penanggung jawab mendapat notifikasi dalam aplikasi (lonceng).
- Pembatasan ditegakkan di backend (403), bukan hanya dengan menyembunyikan tombol.
- Kegiatan di luar lingkup baca dijawab 404 (bukan 403), agar keberadaannya tidak bocor.
- Di antarmuka, `PEGAWAI` ditampilkan sebagai "Pegawai".

## 4. Kebutuhan fungsional

| No | Kebutuhan | Kriteria selesai |
| --- | --- | --- |
| FR-01 | **Masuk dan keamanan akun.** Login hanya dengan email pribadi. Tidak ada pendaftaran mandiri: akun dibuat admin lalu diaktivasi pemiliknya lewat tautan email. Lupa dan atur ulang sandi, ganti email dengan verifikasi, sesi aktif, dan preferensi | Login berhasil dan gagal tercatat; akun terkunci 15 menit setelah 5 kali salah sandi; tautan aktivasi (72 jam) dan atur ulang (1 jam) sekali pakai; pengguna bisa mengeluarkan perangkat lain |
| FR-02 | **Master data dan akun.** Pegawai (NIP opsional untuk non-ASN), bidang dan sub bidang, jenis kegiatan, dan akun beserta bidangnya. Permintaan akun dari halaman login ditinjau admin | Data master dinonaktifkan; bidang dan sub bidang yang belum dipakai pegawai, kegiatan, atau sub bidang boleh dihapus, dan yang nonaktif dipisah ke tab Nonaktif. Akun yang belum membuat kegiatan, mengunggah dokumentasi, atau memeriksa kegiatan bisa dihapus; selebihnya dinonaktifkan agar jejaknya utuh |
| FR-03 | **Audit log.** Setiap perubahan data dan kejadian keamanan dicatat dengan pelaku, waktu, IP, serta nilai sebelum dan sesudah | Hanya bisa ditambah (append-only, dijaga sampai hak basis data); admin dapat memfilter dan membuka detail |
| FR-04 | **Catat kegiatan.** Dua langkah: judul, jenis, waktu, penanggung jawab, bidang, lalu lokasi, uraian, peserta, dan nomor surat. Draf bisa disimpan dan dilanjutkan | Lokasi opsional; waktu mulai terisi waktu sekarang; validasi tanggal terbalik dijawab 422 |
| FR-05 | **Kelola kegiatan.** Ubah, isi hasil, selesaikan sekarang (untuk kegiatan yang sedang berlangsung), batalkan (alasan wajib), dan hapus | Status pelaksanaan dihitung otomatis; pengubahan bersamaan dijawab 409; pembatalan tidak dapat diurungkan |
| FR-06 | **Dokumentasi.** Unggah foto atau PDF, pratinjau, ganti, dan hapus | Maks. 20 MB per berkas dan 10 berkas per kegiatan; jenis dicek lewat magic bytes; foto dikompres dan EXIF atau GPS dibuang; unduhan hanya untuk yang login dan berhak membaca kegiatan |
| FR-07 | **Peta dan lokasi.** Peta 2D dan 3D, pencarian tempat, nama lokasi terisi otomatis dari titik peta, atau koordinat manual | Lokasi bisa diisi tanpa peta (nama dan koordinat manual) |
| FR-08 | **Rekap otomatis.** Jumlah kegiatan per periode (hari, bulan, tahun), per unit induk, dan per jenis | Angka rekap sama dengan angka dashboard dan ekspor untuk filter yang sama |
| FR-09 | **Dashboard.** Dashboard dinas untuk pimpinan dan admin; dashboard tugas untuk pegawai | Dashboard dinas menampilkan total, berlangsung, akan datang, dan selesai; dashboard pegawai mengingatkan kegiatannya yang selesai tanpa dokumentasi |
| FR-10 | **Laporan PDF.** Pilih rentang dan cakupan, pratinjau jumlah, lalu unduh PDF berkop dinas | Isi mengikuti lingkup baca pengguna; maks. 10 ekspor per menit per akun |
| FR-11 | **Pantau dan pemeriksaan.** Pimpinan melihat kegiatan dinas, menyaring per pegawai, dan menandai *Perlu perbaikan* | Catatan wajib; pemeriksaan opsional dan tidak menghalangi kegiatan |
| FR-12 | **Kalender.** Kegiatan per bulan dengan penyaringan per bidang | Hanya kegiatan dalam lingkup baca |
| FR-13 | **Pengingat email otomatis.** H-1 sebelum kegiatan, dan pengingat dokumentasi bagi kegiatan yang sudah selesai | Setiap pengingat terkirim sekali per kegiatan dan penerima; bisa dimatikan di Pengaturan |
| FR-14 | **Pencarian cepat** (Ctrl+K), tema gelap, dan Pengaturan akun (profil, foto, kontak) | Pencarian mengikuti lingkup baca peran |

## 5. Alur pengguna

**A. Admin menyiapkan sistem.** Mengisi bidang, sub bidang, jenis kegiatan, dan pegawai, lalu membuat akun atau menyetujui permintaan akun. Pemilik akun menerima email, membuat sandi, lalu masuk.

**B. Pegawai mencatat kegiatan (first win).**
1. Masuk, lalu buka **Tambah kegiatan**.
2. Isi langkah 1, lalu langkah 2 (atau simpan sebagai draf).
3. Simpan. Kegiatan tampil di daftar, kalender, dan rekap.
4. Setelah kegiatan, unggah foto atau PDF dan isi hasil.

**C. Pimpinan memantau.** Membuka Dashboard, Kalender, dan Rekap, lalu **Pantau** untuk menyaring per pegawai dan menandai kegiatan yang perlu perbaikan.

**D. Siapa pun membuat laporan.** Buka **Laporan**, pilih rentang, pratinjau jumlah, lalu unduh PDF.

Diagramnya ada di [docs/uml](uml/README.md): [use case](uml/01-use-case.md), [activity](uml/02-activity.md), dan [sequence](uml/03-sequence.md).

## 6. Kebutuhan non-fungsional

| No | Kebutuhan | Penerapan |
| --- | --- | --- |
| NFR-01 | **Perlindungan login.** Percobaan dibatasi | 30 percobaan per menit per IP; akun terkunci 15 menit setelah 5 kali salah sandi |
| NFR-02 | **Validasi di backend.** Validasi klien hanya kemudahan | Semua input divalidasi ulang; galat 422 menunjuk kolom yang salah |
| NFR-03 | **Otorisasi di backend.** Menyembunyikan tombol bukan pengamanan | Peran dan lingkup baca dicek di setiap permintaan |
| NFR-04 | **Berkas privat.** Tidak ada URL publik | Berkas hanya bisa dibuka lewat backend dengan cookie sesi |
| NFR-05 | **Audit tanpa data rahasia.** Kredensial tidak masuk log | Nilai sensitif dibuang dari data sebelum dan sesudah |
| NFR-06 | **Kata sandi dan token.** Disimpan aman | Sandi di-hash Argon2id; token aktivasi, atur ulang, dan ganti email disimpan sebagai hash SHA-256; kebijakan sandi minimal 8 karakter berisi huruf dan angka |
| NFR-07 | **Performa.** Daftar dan laporan tetap responsif | Paginasi di server, indeks pada kolom yang sering dicari, dan pemilih berpencarian untuk daftar pegawai yang panjang |
| NFR-08 | **Konsistensi data.** Data dan format seragam | Kategori dan bidang dari master data; waktu disimpan UTC dan ditampilkan WIB (Asia/Jakarta) |
| NFR-09 | **Pengubahan bersamaan.** Data tidak tertimpa diam-diam | Ubah kegiatan memakai versi data; bentrok dijawab 409 |
| NFR-10 | **Header keamanan dan HTTPS.** | X-Frame-Options, nosniff, Referrer-Policy, dan Permissions-Policy; HTTPS dan HSTS oleh Vercel atau Caddy; cookie sesi hanya lewat HTTPS di produksi |
| NFR-11 | **Aksesibilitas.** | Seluruh alur utama bisa dilalui dengan keyboard; kontras memenuhi AA; status tidak bergantung pada warna; area sentuh minimal 44 px di layar sentuh |
| NFR-12 | **Pemasangan.** Mudah dipasang dan dipindah | Berbasis Docker; dipasang di Railway dan Vercel, atau di server dinas dengan Docker Compose |
| NFR-13 | **Ramah ponsel.** Pegawai mengisi dari lapangan | Alur FR-04 sampai FR-06 selesai di layar 375 px; tabel menjadi daftar kartu di layar kecil |

## 7. Status kegiatan

Ada dua status yang berbeda:

| Status | Nilai | Cara berubah |
| --- | --- | --- |
| **Pelaksanaan** | Akan datang, Berlangsung, Selesai, Dibatalkan | **Dihitung di backend** dari waktu mulai, waktu selesai, dan pembatalan, lalu dikirim sebagai `statusPelaksanaan`. Antarmuka tidak menghitung sendiri. Tidak bisa dipilih manual; *Dibatalkan* hanya lewat tombol Batalkan |
| **Pemeriksaan** | Biasa (`terkirim`), Perlu perbaikan | Ditandai pimpinan dengan catatan. Opsional: kegiatan yang tidak ditandai tetap sah. Setiap perubahan kegiatan menghapus tanda *Perlu perbaikan* |

Diagram perubahannya ada di [docs/uml/06-state.md](uml/06-state.md).

## 8. Arsitektur dan deployment

Tiga lapisan, dengan **satu origin** untuk UI dan API.

| Lapisan | Teknologi | Peran |
| --- | --- | --- |
| Frontend | Next.js 16 (App Router), Tailwind CSS 4, shadcn/ui, TanStack Query | Antarmuka. Meneruskan `/api/*` ke backend sehingga cookie sesi milik domain frontend dan tidak ada urusan CORS |
| Backend | Bun, Elysia, Prisma, Better Auth | API REST berlapis: route, controller, service, repository. Autentikasi, validasi, hak akses, rekap, PDF, email, dan pengingat |
| Database | PostgreSQL 17 | Data kegiatan, akun, master data, dan audit log |
| Berkas | Cloudinary (atau folder lokal bila tidak diisi) | Foto dan PDF, disimpan privat |
| Email | Brevo API (atau SMTP) | Aktivasi, atur ulang sandi, dan pengingat |

**Deployment.** Frontend di Vercel dan backend serta PostgreSQL di Railway, atau seluruhnya di server dinas dengan Docker Compose dan Caddy. Langkahnya ada di [README](../README.md#deploy-online-lewat-railway-dan-vercel), dan gambarnya di [docs/uml/08-deployment.md](uml/08-deployment.md) dan [docs/uml/07-component.md](uml/07-component.md).

## 9. Penanganan galat

Format galat seragam:

```json
{ "code": "...", "message": "...", "details": [{ "field": "...", "message": "..." }] }
```

| Status | Arti | Perilaku antarmuka |
| --- | --- | --- |
| 401 | Belum login atau sesi berakhir | Dialihkan ke `/login?sesi=berakhir` dengan muat ulang penuh |
| 403 | Peran tidak berhak, atau `Origin` tidak cocok (`ASAL_DITOLAK`) | Pesan tidak punya akses |
| 404 | Tidak ditemukan, atau di luar lingkup baca | Halaman tidak ditemukan |
| 409 | Data sudah diubah pengguna lain | Pengguna diminta memuat ulang |
| 413, 415 | Berkas terlalu besar atau jenis tidak didukung | Pesan di formulir unggah |
| 422 | Validasi gagal | Pesan ditampilkan di bawah kolom yang salah |
| 429 | Terlalu banyak percobaan atau akun terkunci | Pesan menunggu lalu coba lagi |

Setiap layar data menangani empat keadaan: memuat, kosong, galat (dengan "Coba lagi"), dan berhasil.

## 10. Kriteria penerimaan

Setiap butir diuji otomatis di `apps/api/tests`.

| No | Kriteria | Hasil yang diharapkan |
| --- | --- | --- |
| 1 | Lima kali salah sandi | Akun terkunci 15 menit, kejadian tercatat di audit log |
| 2 | Pegawai membuka kegiatan di luar lingkupnya | 404 |
| 3 | Pegawai atau pimpinan mengubah kegiatan orang lain | 403 |
| 4 | Dua orang mengubah kegiatan yang sama bersamaan | Yang kedua dijawab 409 |
| 5 | Tanggal selesai sebelum tanggal mulai | 422 |
| 6 | Mengunggah berkas `.exe` atau berkas 20,01 MB | Ditolak |
| 7 | Mengunduh dokumentasi tanpa login | Ditolak |
| 8 | Setiap aksi yang mengubah data | Tercatat di audit log |
| 9 | Angka dashboard, rekap, dan ekspor untuk filter yang sama | Konsisten |
| 10 | Akun yang sudah membuat kegiatan dihapus | Ditolak; cukup dinonaktifkan |
| 11 | Tautan aktivasi atau atur ulang dipakai dua kali | Ditolak pada pemakaian kedua |

Pemeriksaan manual di lingkungan produksi: email aktivasi sampai dan bisa dibuka, unggah foto dan PDF berhasil dibuka kembali, dan PDF laporan terunduh dengan kop dinas.

## 11. Skema data

Tabel dan relasinya digambar di [docs/uml/05-erd.md](uml/05-erd.md), sumbernya `apps/api/prisma/schema.prisma`. Ringkasannya:

| Kelompok | Tabel |
| --- | --- |
| Autentikasi | `user`, `session`, `account`, `verification`, `preferensi_pengguna` |
| Master data | `bidang` (bidang dan sub bidang), `pegawai`, `jenis_kegiatan` |
| Kegiatan | `kegiatan`, `dokumentasi`, `catatan_pemeriksaan`, `draf_kegiatan`, `pengingat` |
| Pendukung | `audit_log`, `permintaan_akun` |

Prinsip data: akun terpisah dari data pegawai; status akun diturunkan, tidak disimpan; data master dinonaktifkan, dan hanya bidang yang belum dipakai yang boleh dihapus; kegiatan dihapus secara lunak; `audit_log` hanya bertambah dan tidak punya kunci asing ke akun agar riwayat tetap utuh.

## 12. Keputusan dan batasan

- **Tanpa persetujuan bertingkat.** Kegiatan langsung sah saat dicatat. Pemeriksaan pimpinan opsional. Dokumentasi juga opsional; pengingat melengkapinya cukup muncul di halaman detail kegiatan yang sudah selesai, tidak di dashboard.
- **Tanpa Excel.** Ekspor Excel dihapus; laporan hanya PDF berkop dinas.
- **Tanpa pendaftaran mandiri.** Akun dibuat admin atau disetujui dari permintaan akun; admin tidak pernah menentukan atau melihat kata sandi.
- **Email wajib berfungsi.** Tanpa email, akun baru tidak bisa diaktivasi dan lupa sandi tidak bisa dipakai.
- **Penghapusan akun dibatasi.** Akun yang sudah meninggalkan data kegiatan hanya dinonaktifkan.
- **Alamat pengirim email.** Alamat gratis (mis. Gmail) lebih mudah masuk spam; untuk pemakaian sebenarnya pakai alamat dinas atau domain sendiri.
- **Biaya layanan.** Railway berbayar setelah masa percobaan (sekitar US$5 per bulan); layanan lain memakai paket gratis dengan batasnya masing-masing.
- **Stack dikunci** (bagian 8). Tidak ada fitur di luar bagian 4 tanpa persetujuan.

## 13. Riwayat roadmap

Fitur dikerjakan bertahap:

| Fase | Isi | Berkas spesifikasi |
| --- | --- | --- |
| 1. Pondasi pencatatan | Catat kegiatan: formulir cepat, waktu dan lokasi, jenis, draf | [01-catat-kegiatan.md](features/01-catat-kegiatan.md) |
| 2. Pengelolaan dan dokumentasi | Daftar kegiatan, pencarian, filter, detail; unggah, pratinjau, ganti, dan hapus dokumentasi | [02](features/02-daftar-kegiatan.md), [03](features/03-bukti-foto-dokumen.md) |
| 3. Rekap dan pelaporan | Rekap otomatis, ringkasan angka, grafik; pratinjau dan unduh laporan | [04](features/04-rekap-otomatis.md), [05](features/05-cetak-unduh-laporan.md) |
| 4. Pantau dan akun | Pantau pimpinan; masuk, kelola akun, dan profil | [06](features/06-pantau-pimpinan.md), [07](features/07-masuk-kelola-akun.md) |
| Tambahan | Kalender, pengingat email, audit log, permintaan akun, peta 3D, pencarian cepat | [README](../README.md#fitur) |
