# Aplikasi Pendataan Kegiatan Diskominfo Kota Palembang

Aplikasi web untuk mencatat, memantau, dan melaporkan kegiatan dinas. Pegawai mencatat kegiatan dan dokumentasinya, pimpinan memantau lewat dashboard, kalender, dan rekap, dan admin mengelola pegawai, bidang, akun, serta audit log.

| Folder | Isi |
| --- | --- |
| [`apps/api/`](apps/api/README.md) | API REST: Bun, Elysia, Prisma (PostgreSQL), Better Auth. Arsitektur berlapis: route, controller, service, repository |
| [`apps/web/`](apps/web/README.md) | Antarmuka: Next.js 16 (App Router), Tailwind CSS 4, shadcn/ui, TanStack Query, MapLibre GL |
| [`docs/api/`](docs/api/README.md) | Dokumentasi API: ringkasan semua endpoint, aturan umum, hak akses, serta rincian header, body, dan respons |
| [`docs/features/`](docs/features/README.md) | Spesifikasi per fitur: tujuan, kriteria selesai, dan daftar tugas |
| [`docs/uml/`](docs/uml/README.md) | Diagram UML dalam Mermaid (use case, activity, sequence, class, ERD, state, component, deployment) |
| [`docs/PRD.md`](docs/PRD.md) | Kebutuhan produk (FR, NFR, kriteria penerimaan) |
| [`apps/web/DESIGN.md`](apps/web/DESIGN.md) | Spesifikasi tampilan dan perilaku UI |

## Fitur

### Peran pengguna

| Peran | Yang bisa dilakukan | Menu yang terlihat |
| --- | --- | --- |
| **Pegawai** | Satu-satunya peran yang mencatat, mengubah, membatalkan, dan menghapus kegiatan (miliknya), mengunggah dokumentasi, mengisi hasil, serta menerima notifikasi catatan perbaikan | Dashboard, Kegiatan bidang saya, Kegiatan saya, Kalender, Rekap, Laporan, Pengaturan, lonceng notifikasi |
| **Pimpinan** | Melihat seluruh kegiatan, dokumentasi, hasil, rekap, dan laporan; memeriksa dan memberi catatan perbaikan. Tidak mengubah data | Dashboard, Kegiatan, Kalender, Rekap, Laporan, Pantau, Pengaturan |
| **Admin** | Melihat seluruh kegiatan, memeriksa dan memberi catatan perbaikan, mengelola akun, master data, dan audit log. Tidak menambah, mengubah, atau menghapus kegiatan | Dashboard, Kegiatan, Kalender, Rekap, Laporan, Pantau, Manajemen akun, Master data, Audit log, Pengaturan |

Aturan hak akses ditegakkan di backend pada setiap permintaan. Kegiatan di luar lingkup baca dijawab 404 (bukan 403), agar keberadaannya tidak bocor. Pemeriksaan (status terpisah dari status pelaksanaan) dilakukan pimpinan atau admin; setiap pemeriksaan tercatat di riwayat dan audit log, dan pegawai terkait mendapat notifikasi di lonceng.

### Alur kerja singkat

1. **Admin menyiapkan master data:** bidang dan sub bidang, jenis kegiatan, lalu data pegawai.
2. **Admin membuat akun** (atau menyetujui permintaan akun dari halaman login). Sistem mengirim tautan aktivasi ke email pemiliknya, yang lalu membuat kata sandinya sendiri.
3. **Pegawai mencatat kegiatan** dalam dua langkah (boleh disimpan sebagai draf), lalu mengunggah dokumentasi dan mengisi hasil setelah kegiatan selesai. Pengingat email dikirim otomatis.
4. **Pimpinan memantau** lewat dashboard, kalender, dan rekap, serta boleh memeriksa kegiatan: *Sudah diperiksa* atau *Perlu perbaikan* (dengan catatan untuk pegawai).
5. **Siapa pun mengunduh laporan PDF** berkop dinas sesuai lingkup bacanya.

Alurnya digambar lengkap di [diagram activity](docs/uml/02-activity.md), dan perubahan statusnya di [diagram state](docs/uml/06-state.md).

### Daftar fitur

| Kebutuhan | Fitur | Dipakai oleh | Halaman |
| --- | --- | --- | --- |
| FR-01 | **Masuk dan keamanan akun.** Login hanya dengan email pribadi; akun terkunci 15 menit setelah 5 kali salah sandi. Lupa dan atur ulang sandi, ganti email dengan verifikasi, melihat dan mencabut sesi aktif, foto profil, dan preferensi (tema, notifikasi) | Semua peran | `/login`, `/pengaturan` |
| FR-02 | **Akun dan permintaan akun.** Tanpa pendaftaran mandiri: akun dibuat admin atau dari permintaan akun, lalu diaktivasi pemiliknya lewat email. Akun bisa dinonaktifkan atau dihapus; akun yang sudah membuat kegiatan, mengunggah dokumentasi, atau memeriksa hanya bisa dinonaktifkan agar jejaknya utuh | Admin | `/admin/akun` |
| FR-02 | **Master data.** Pegawai (NIP opsional untuk non-ASN), bidang dan sub bidang, dan jenis kegiatan. Pegawai dan jenis kegiatan dinonaktifkan, tidak dihapus. Bidang dan sub bidang yang belum dipakai pegawai, kegiatan, atau sub bidang bisa dihapus; yang nonaktif dipisah ke tab Nonaktif | Admin | `/admin/master` |
| FR-03 | **Audit log** append-only (dijaga sampai hak basis data) dengan filter serta nilai sebelum dan sesudah | Admin | `/admin/audit-log` |
| FR-04, FR-05 | **Kegiatan.** Catat dalam dua langkah, simpan draf, ubah, isi hasil, selesaikan sekarang (saat berlangsung), batalkan (alasan wajib), dan hapus. Status pelaksanaan (akan datang, berlangsung, selesai, dibatalkan) dihitung otomatis dari waktu. Pengubahan bersamaan oleh dua orang dijawab 409 | Pegawai, Admin | `/kegiatan`, `/kegiatan/baru` |
| FR-06 | **Dokumentasi.** Unggah foto atau PDF maksimal 20 MB (jenis berkas dicek lewat magic bytes, foto dikompres, EXIF dan GPS dibuang), maksimal 10 berkas per kegiatan. Unduhan hanya untuk yang login dan berhak membaca kegiatannya | Pegawai, Admin (lihat: semua peran) | Detail kegiatan |
| FR-07 | **Peta dan lokasi.** Peta 2D dan 3D (MapLibre GL dengan OpenFreeMap), pencarian tempat, nama lokasi terisi otomatis dari titik peta, atau koordinat manual. Lokasi opsional | Pegawai, Admin | Formulir dan detail kegiatan |
| FR-08, FR-10 | **Rekap dan laporan.** Rekap jumlah kegiatan per unit induk dan jenis, serta ekspor PDF berkop dinas dengan pratinjau | Semua peran | `/rekap`, `/laporan` |
| FR-09 | **Dashboard.** Dashboard dinas untuk pimpinan dan admin; dashboard tugas pribadi untuk pegawai | Semua peran | `/dashboard` |
| Tambahan | **Kalender** bulanan dengan penyaringan per bidang | Semua peran | `/kalender` |
| Tambahan | **Pantau pemeriksaan.** Daftar kegiatan menurut status pemeriksaan, dengan pencarian dan penyaring pegawai | Pimpinan | `/pantau` |
| Tambahan | **Pengingat email otomatis:** H-1 sebelum kegiatan, dan pengingat dokumentasi bagi kegiatan yang sudah selesai. Dijalankan setiap 15 menit; penerima bisa mematikannya di Pengaturan | Penanggung jawab kegiatan | Email |
| Tambahan | Pencarian cepat **Ctrl+K**, mode gelap, dan tampilan yang menyesuaikan layar ponsel | Semua peran | Seluruh aplikasi |

Spesifikasi dan kriteria selesai tiap fitur ada di [docs/features](docs/features/README.md).

### Status pada kegiatan

Ada dua status yang berbeda, dan sering tertukar:

| Status | Arti | Cara berubah |
| --- | --- | --- |
| **Pelaksanaan** (Akan datang, Berlangsung, Selesai, Dibatalkan) | Posisi kegiatan terhadap waktu | Otomatis dari waktu mulai dan selesai. Tidak bisa dipilih manual; untuk membuat kegiatan langsung *Selesai*, ubah waktu selesainya. *Dibatalkan* hanya lewat tombol Batalkan |
| **Pemeriksaan** (Sudah diperiksa, Perlu perbaikan) | Penilaian pimpinan | Ditandai pimpinan. Bersifat **opsional**: kegiatan yang tidak pernah diperiksa tetap sah dan tidak menampilkan lencana pemeriksaan. Mengubah kegiatan mengembalikannya menjadi *Belum diperiksa* agar pimpinan tahu ada perubahan |

### Akun

Tidak ada pendaftaran mandiri. Admin membuat akun (nama, email pribadi, NIP opsional, jabatan, bidang, role), lalu sistem mengirim tautan aktivasi ke email pemiliknya. Pemilik membuat kata sandi sendiri; admin tidak pernah menentukan atau melihat kata sandi. Karena itu **pengiriman email wajib berfungsi** sebelum aplikasi dipakai. Alur lengkapnya ada di [diagram sequence](docs/uml/03-sequence.md#32-aktivasi-akun-lewat-email).

## API

API REST di `apps/api` (Bun, Elysia, Prisma, Better Auth), alamat dasar `/api`. Ringkasan semua endpoint, aturan umum (cookie sesi, perlindungan CSRF, format galat, batas laju), dan hak akses per endpoint ada di [docs/api/README.md](docs/api/README.md).

| Kelompok | Contoh endpoint | Rincian |
| --- | --- | --- |
| Autentikasi dan akun sendiri | `POST /api/auth/sign-in/email`, `/api/aktivasi`, `/api/lupa-sandi`, `/api/me/*` | [api-auth.md](docs/api/api-auth.md) |
| Kegiatan, draf, dokumentasi | `/api/kegiatan`, `/api/draf-kegiatan`, `/api/kegiatan/:id/dokumentasi` | [api-kegiatan.md](docs/api/api-kegiatan.md) |
| Dashboard, kalender, rekap, pantau, ekspor | `/api/dashboard`, `/api/kalender`, `/api/rekap`, `/api/ekspor/kegiatan.pdf` | [api-laporan.md](docs/api/api-laporan.md) |
| Administrasi | `/api/admin/akun`, `/api/admin/pegawai`, `/api/admin/bidang`, `/api/audit-log` | [api-admin.md](docs/api/api-admin.md) |

Arsitektur backend berlapis: **route** (alamat, peran, validasi) → **controller** → **service** (aturan bisnis, hak akses, audit) → **repository** (query Prisma). Penjelasannya ada di [apps/api/README.md](apps/api/README.md) dan [diagram class](docs/uml/04-class.md#42-lapisan-backend).

## Diagram UML

Delapan diagram Mermaid di [docs/uml](docs/uml/README.md), tampil langsung di GitHub dan di VS Code:

| Diagram | Menjawab pertanyaan |
| --- | --- |
| [Use case](docs/uml/01-use-case.md) | Siapa saja penggunanya, dan apa yang bisa dilakukan masing-masing? |
| [Activity](docs/uml/02-activity.md) | Bagaimana alur mencatat kegiatan sampai dokumentasi, dan alur akun sampai aktif? |
| [Sequence](docs/uml/03-sequence.md) | Apa yang terjadi antar komponen saat login, aktivasi akun, dan unggah dokumentasi? |
| [Class](docs/uml/04-class.md) | Apa saja kelas domainnya, dan bagaimana lapisan backend tersusun? |
| [ERD](docs/uml/05-erd.md) | Apa saja tabel database dan relasinya? |
| [State](docs/uml/06-state.md) | Bagaimana status kegiatan, akun, dan permintaan akun berubah? |
| [Component](docs/uml/07-component.md) | Apa saja bagian sistem dan layanan luar yang dipakai? |
| [Deployment](docs/uml/08-deployment.md) | Bagaimana aplikasi dipasang di Railway dan Vercel, atau di VPS? |

## Menjalankan untuk pengembangan

Prasyarat: [Bun](https://bun.sh) 1.4, PostgreSQL 17 (mis. lewat Docker, lihat `apps/api/.env.example`), dan Mailpit untuk melihat email (bawaan Laragon, http://localhost:8025).

```bash
# 1. Backend
cd apps/api
bun install
cp .env.example .env            # isi BETTER_AUTH_SECRET dan SEED_ADMIN_PASSWORD
bun run db:migrate:prod         # menerapkan migrasi Prisma
bun run db:seed                 # bidang, jenis kegiatan, akun admin
bun run db:seed:demo            # opsional: pegawai, akun, dan kegiatan fiktif untuk mencoba tampilan (ditolak di produksi)
bun run dev                     # http://localhost:3001/api

# 2. Frontend (terminal kedua)
cd apps/web
bun install
bun run dev                     # http://localhost:3000
```

Frontend meneruskan `/api/*` ke backend, sehingga UI dan API berada di satu origin seperti di produksi. Frontend tidak butuh file `.env` saat development; satu-satunya pengaturannya, `API_URL`, dijelaskan di `apps/web/.env.example`.

## Pengujian

```bash
cd apps/api && bun test         # 147 uji API dan unit, memakai basis data terpisah kominfo_pd_kg_test
cd apps/web && bun test src     # uji skema form, format tampilan, NIP, jam, dan kebijakan kata sandi
```

Uji backend butuh PostgreSQL khusus uji dan berkas `apps/api/.env.test` (salin dari `.env.test.example`):

```bash
docker run -d --name kominfo-pg-test -e POSTGRES_PASSWORD=uji123 -e POSTGRES_DB=kominfo_pd_kg_test -p 5435:5432 postgres:17
```

Uji backend mencakup kriteria penerimaan PRD bagian 10: penguncian akun, 403 untuk pegawai lain dan pimpinan, 409 pengubahan bersamaan, 422 tanggal terbalik, berkas .exe dan 20,01 MB ditolak, unduhan tanpa login ditolak, audit log untuk setiap aksi, serta angka dashboard, rekap, dan ekspor yang konsisten. Basis data uji dibuat ulang otomatis setiap kali uji dijalankan; uji menolak berjalan bila `DATABASE_URL` tidak berakhiran `_test`. Email tidak pernah benar-benar dikirim saat pengujian; email ditangkap di memori agar isinya (mis. tautan aktivasi) bisa diperiksa.

## File `.env`: mana yang dipakai di mana

Setiap cara menjalankan aplikasi membaca pengaturan dari tempat yang berbeda. Semua file `.env` dikecualikan di `.gitignore` karena berisi rahasia; yang masuk repository hanya contohnya (`*.example`).

| Dipakai saat | File atau tempat | Dibuat dari |
| --- | --- | --- |
| Development backend | `apps/api/.env` | `apps/api/.env.example` |
| Development frontend | `apps/web/.env` (opsional, hanya `API_URL`) | `apps/web/.env.example` |
| Uji backend | `apps/api/.env.test` | `apps/api/.env.test.example` |
| Deploy VPS dengan Docker | **`.env` di root proyek**, dibaca `docker-compose.yml` | `docker.env.example` |
| Deploy Railway + Vercel | Tidak ada file; isi di tab **Variables** Railway dan **Environment Variables** Vercel | Daftar di bawah |

Jadi `.env` di root hanya ada di server VPS. Di laptop atau saat memakai Railway + Vercel, file itu memang tidak perlu.

Yang harus benar di produksi, apa pun caranya:

- **Email** (`BREVO_API_KEY`, atau `SMTP_*`): tanpa email, akun baru tidak bisa diaktivasi dan lupa sandi tidak bisa dipakai.
- **`FRONTEND_URL` dan `BETTER_AUTH_URL`** sama persis dengan alamat publik aplikasi (`https://`, tanpa garis miring di akhir). Tautan di email dibuat dari `FRONTEND_URL`, dan backend menolak permintaan pengubah data yang `Origin`-nya tidak cocok (403 `ASAL_DITOLAK`, perlindungan CSRF).
- **`SEED_ADMIN_PASSWORD`** mengikuti kebijakan kata sandi: minimal 8 karakter, berisi huruf dan angka, tidak memuat bagian depan email admin.

## Deploy (online lewat Railway dan Vercel)

Aplikasi dipasang di empat layanan. Semuanya cukup diatur lewat klik di situs masing-masing, tanpa server sendiri.

```
Pengguna → Vercel (frontend Next.js) → Railway (backend Elysia) → Railway (PostgreSQL)
                                          ├→ Cloudinary (simpan foto dan dokumen)
                                          └→ Brevo (kirim email undangan dan pengingat)
```

| Bagian | Layanan | Catatan |
| --- | --- | --- |
| Frontend | [Vercel](https://vercel.com) | Gratis. Meneruskan `/api/*` ke backend, jadi cookie login tetap milik domain Vercel |
| Backend | [Railway](https://railway.com) | Dibangun dari `apps/api/Dockerfile`. Setiap kali menyala (`bun run start`), backend menjalankan migrasi tabel dan data awal sendiri |
| PostgreSQL | Railway | Satu klik, alamat koneksinya langsung tersedia untuk backend |
| Berkas | [Cloudinary](https://cloudinary.com) | Paket gratis. Foto dan PDF disimpan privat (tipe *authenticated*), hanya bisa dibuka lewat backend setelah login |
| Email | [Brevo](https://www.brevo.com) | Paket gratis. Railway Hobby memblokir SMTP (termasuk Zoho), jadi email dikirim lewat API Brevo. Alamat Zoho tetap bisa menjadi pengirimnya. Wajib: aktivasi akun, lupa sandi, dan ganti email memakai tautan email |

Railway memberi kredit percobaan, setelah itu paket Hobby berbayar (sekitar US$5 per bulan; cek harga terbaru di situsnya).

### Langkah 1: unggah kode ke GitHub

Folder ini sudah berupa repository Git. Buat repository **private** baru di [github.com/new](https://github.com/new) (tanpa README), lalu dari Git Bash di folder proyek:

```bash
git remote add origin https://github.com/NAMA-AKUN/NAMA-REPO.git
git push -u origin main
```

File rahasia (`.env`, `test.txt`) tidak ikut terunggah karena sudah dikecualikan di `.gitignore`.

### Langkah 2: siapkan Brevo (email)

1. Daftar gratis di Brevo.
2. Buka **Senders, Domains & Dedicated IPs → Senders → Add a sender**, isi email yang akan menjadi pengirim (mis. alamat Zoho dinas), lalu verifikasi lewat email yang masuk ke kotak tersebut. Alamat gratis seperti Gmail bisa dipakai untuk uji coba (pilih **Add this sender anyway**), tetapi emailnya lebih mudah masuk spam atau ditolak. Untuk pemakaian sebenarnya pakai alamat dinas atau domain sendiri.
3. Buka **SMTP & API → tab API keys & MCP → Generate a new API key** (bukan tab SMTP; kunci SMTP tidak dipakai). Beri akses **Restricted** dan ubah **Transactional email** menjadi **All**, biarkan izin lain **None**. Salin kuncinya (berawalan `xkeysib-`). Simpan, karena hanya ditampilkan sekali. Kunci mati sendiri bila 90 hari tidak dipakai; bila itu terjadi, buat kunci baru dan ganti di Railway.
4. Buka **Security → Authorized IPs**, lalu klik **Deactivate for API keys**. Railway memakai alamat IP yang berubah-ubah, sehingga tanpa ini panggilan API Brevo diblokir. Aktifkan **Two-factor authentication** di halaman yang sama untuk mengamankan akun.

### Langkah 2b: siapkan Cloudinary (penyimpanan berkas)

1. Daftar gratis di Cloudinary.
2. Di **Settings → API Keys**, klik **Generate New API Key** dengan nama khusus aplikasi ini (mis. `app-kegiatan`) dan peran **Master Admin** (peran lain tidak cukup untuk unggah dan hapus lewat API). Susun `cloudinary://API_KEY:API_SECRET@CLOUD_NAME`, dengan API Key dan API Secret dari kunci baru itu. `CLOUD_NAME` adalah yang tertulis setelah "Cloud name:" di halaman itu (bukan nama environment). Tanpa awalan `CLOUDINARY_URL=`, tanpa tanda kutip, spasi, atau tanda `<` `>`.
3. Buka **Settings → Security**, centang **Allow delivery of PDF and ZIP files**, lalu simpan. Tanpa ini dokumen PDF tidak bisa dibuka.

### Langkah 3: backend dan PostgreSQL di Railway

1. Masuk ke Railway dengan akun GitHub, lalu **New Project → Deploy from GitHub repo** dan pilih repository tadi.
2. Klik layanan yang terbentuk, buka **Settings → Root Directory**, isi `apps/api`. Railway mengenali proyek Bun dari `package.json` dan `bun.lock`.
3. Di kanvas proyek klik **+ Create → Database → PostgreSQL**.
4. Buka tab **Variables** layanan backend. Railway membaca `apps/api/.env.example` dan menyodorkan semuanya sebagai *Suggested Variables*; hapus (klik ✕) yang tidak dipakai (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `APP_DB_USER`, `APP_DB_PASSWORD`, `STORAGE_DIR`, `PORT`, `DATABASE_POOL_MAX`), dan isi yang berikut (volume tidak diperlukan karena berkas disimpan di Cloudinary). Di **Settings**, matikan **Wait for CI** karena repository tidak punya GitHub Actions; bila dibiarkan menyala, deploy bisa tertahan:

   | Variable | Isi |
   | --- | --- |
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (diketik persis begitu; Railway mengisinya otomatis. Sesuaikan `Postgres` bila nama layanan database Anda berbeda) |
   | `NODE_ENV` | `production` |
   | `BETTER_AUTH_SECRET` | Teks acak minimal 32 karakter, buat di Git Bash dengan `openssl rand -hex 32` |
   | `BETTER_AUTH_URL` | **Alamat Vercel** (bukan alamat Railway), karena pengguna hanya melihat alamat itu. Sementara `https://contoh.vercel.app`, diganti di langkah 5. Variabel ini wajib; bila kosong, backend berhenti menyala |
   | `FRONTEND_URL` | Sama dengan `BETTER_AUTH_URL` |
   | `CLOUDINARY_URL` | Nilai dari langkah 2b.2 (`cloudinary://...`) |
   | `SEED_ADMIN_EMAIL` | Email admin pertama |
   | `SEED_ADMIN_PASSWORD` | Sandi admin pertama: minimal 8 karakter, berisi huruf dan angka, tidak memuat bagian depan email admin |
   | `BREVO_API_KEY` | Kunci dari langkah 2 |
   | `SMTP_FROM` | `Aplikasi Pendataan Kegiatan <alamat-yang-diverifikasi-di-brevo@domain>` (harus sama persis dengan sender yang aktif di Brevo) |

   Variabel lain di `.env.example` (`PENGINGAT_AKTIF`, `CLOUDINARY_FOLDER`, dan seterusnya) opsional dan punya nilai bawaan.

5. Buka **Settings → Networking → Generate Domain**. Anda mendapat alamat seperti `https://xxx.up.railway.app`. **Port domain harus sama dengan port yang dipakai backend.** Railway menyuntikkan `PORT` sendiri (mis. 8080), padahal Dockerfile menetapkan 3001. Cek **Deploy Logs**: baris `API berjalan di http://localhost:XXXX/api` menunjukkan port yang dipakai; samakan port domain dengan angka itu lewat ikon pensil di domain (atau isi variabel `PORT` agar sama dengan port domain). Bila tidak sama, Vercel akan menerima 502 "Application failed to respond". Setelah itu buka `https://xxx.up.railway.app/api/health`; bila tampil `{"status":"ok"}`, backend sudah jalan dan tersambung ke PostgreSQL.

### Langkah 4: frontend di Vercel

1. Masuk ke Vercel dengan akun GitHub, lalu **Add New → Project** dan impor repository yang sama.
2. Isi **Root Directory** dengan `apps/web`. Framework terdeteksi otomatis sebagai Next.js.
3. Di **Environment Variables** tambahkan `API_URL` dengan alamat Railway dari langkah 3.5, tanpa garis miring di akhir. Variabel Vercel baru berlaku pada deployment berikutnya, jadi lakukan **Redeploy** bila Anda mengubahnya setelah deploy pertama.
4. Klik **Deploy**. Setelah selesai Anda mendapat alamat seperti `https://web-xxxx.vercel.app`. Untuk alamat yang lebih rapi, buka **Settings → Domains → Add Domain** dan tambahkan nama sendiri, mis. `kegiatan-diskominfo-plg.vercel.app` (alamat lama otomatis dialihkan). Tentukan alamat final sebelum langkah 5.

### Langkah 5: sambungkan keduanya

Kembali ke Railway, ubah `BETTER_AUTH_URL` dan `FRONTEND_URL` menjadi alamat Vercel dari langkah 4.4. Railway akan menyalakan ulang backend otomatis. Setelah itu buka alamat Vercel dan login dengan `SEED_ADMIN_EMAIL` dan `SEED_ADMIN_PASSWORD`.

Sebelum membuat akun pegawai, uji email: buat satu akun dengan email Anda sendiri di **Manajemen akun → Buat akun**, lalu pastikan tautan aktivasinya sampai dan bisa dibuka. Bila email gagal, akun tetap tersimpan dan halaman admin menampilkan pesan galatnya; setelah pengaturan email diperbaiki, pakai **Kirim ulang undangan**.

Setelah admin pertama bisa masuk, ganti sandinya lewat **Pengaturan → Keamanan**, lalu hapus `SEED_ADMIN_PASSWORD` dari Railway.

**Cara kerja akun seed.** Seed berjalan setiap kali backend menyala. Bila email di `SEED_ADMIN_EMAIL` sudah ada, akunnya dilewati dan sandi tidak ditimpa; bila belum ada, akun admin baru dibuat. Jadi mengganti `SEED_ADMIN_PASSWORD` tidak mengubah sandi admin yang sudah ada (ganti lewat aplikasi), dan setelah email admin diganti lewat Pengaturan, `SEED_ADMIN_PASSWORD` lama harus dihapus agar seed tidak membuat admin baru dengan email lama.

### Memperbarui aplikasi

Cukup `git push`. Vercel dan Railway membangun ulang sendiri, dan migrasi tabel baru berjalan otomatis saat backend menyala (`prisma migrate deploy`).

**Mengubah skema database.** Ubah `apps/api/prisma/schema.prisma`, lalu di komputer sendiri jalankan `bun run db:migrate` (membuat folder migrasi baru dan menerapkannya ke database lokal). Periksa `migration.sql`, jalankan tes, lalu commit folder migrasinya bersama kodenya dan `git push`. Jangan mengedit migrasi yang sudah ter-deploy dan jangan mengubah skema langsung di database Railway. Menambah tabel atau kolom aman bagi data lama (kolom wajib baru butuh nilai bawaan). **Menghapus atau mengganti nama kolom dan tabel menghilangkan datanya**; buat cadangan lebih dulu (Railway → Postgres → Backups) dan ubah penggantian nama menjadi `RENAME` manual di SQL migrasi.

### Bila ada masalah

| Gejala | Periksa |
| --- | --- |
| Halaman Vercel terbuka tapi login gagal atau "server tidak dapat dihubungi" | `API_URL` di Vercel, dan `BETTER_AUTH_URL`/`FRONTEND_URL` di Railway harus persis alamat Vercel (`https://`, tanpa garis miring di akhir) |
| Backend Railway gagal menyala | Tab **Deployments → View logs**; biasanya ada variable wajib yang belum diisi (pesannya menyebut namanya) |
| Login dijawab 502 "Application failed to respond" padahal log backend sehat | Port domain di **Settings → Networking** tidak sama dengan port di baris `API berjalan di http://localhost:XXXX/api` |
| Backend berhenti dengan "Invalid CLOUDINARY_URL protocol" | Nilai `CLOUDINARY_URL` tidak diawali `cloudinary://` (biasanya awalan `CLOUDINARY_URL=` ikut tersalin) |
| Email gagal dengan galat soal alamat IP atau 401 dari Brevo | **Security → Authorized IPs** belum dinonaktifkan untuk API keys, atau `BREVO_API_KEY` salah (bukan kunci SMTP) |
| Email tidak sampai | `BREVO_API_KEY` dan `SMTP_FROM` (harus sender yang sudah diverifikasi). Periksa juga folder spam |
| Tautan di email mengarah ke alamat yang salah | `FRONTEND_URL` di Railway harus alamat publik frontend |
| Simpan data atau login dijawab 403 `ASAL_DITOLAK` | `FRONTEND_URL`/`BETTER_AUTH_URL` tidak sama dengan alamat yang dibuka di peramban |
| Banyak pegawai mendapat "Terlalu banyak permintaan" saat login bersamaan | Login dibatasi 30 percobaan per menit per alamat IP (semua email dihitung) (`apps/api/src/lib/auth.ts`, `customRules`). Pegawai di satu kantor biasanya keluar lewat satu IP publik, jadi naikkan batas ini bila perlu |
| Unggah foto gagal | `CLOUDINARY_URL` di Railway (harus diawali `cloudinary://`). Pesan galatnya ada di log backend |
| Dokumen PDF tidak bisa dibuka | Cloudinary **Settings → Security → Allow delivery of PDF and ZIP files** belum dicentang |
| Berkas di atas 10 MB ditolak | Batas paket gratis Cloudinary untuk berkas non-gambar. Perkecil PDF-nya, atau naikkan paket Cloudinary |

## Deploy ke VPS dengan Docker

Alternatif dari Railway + Vercel bila aplikasi dipasang di VPS sendiri (mis. server Diskominfo). Satu `docker compose` menjalankan empat container: PostgreSQL, backend (`apps/api/Dockerfile`), frontend (`apps/web/Dockerfile`), dan Caddy (`Caddyfile`) sebagai pintu masuk HTTPS. Hanya Caddy yang membuka port ke luar (80 dan 443).

1. Pasang Docker di VPS, lalu salin proyek ini ke sana (`git clone`).
2. Arahkan DNS domain (mis. `kegiatan.palembang.go.id`) ke IP VPS. Belum punya domain? Pakai IP VPS dulu (peramban akan memberi peringatan sertifikat).
3. Di root proyek: `cp docker.env.example .env`, lalu isi `DOMAIN`, `DB_PASSWORD`, `BETTER_AUTH_SECRET` (buat dengan `openssl rand -base64 48`), `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, dan pengaturan email (`SMTP_*` atau `BREVO_API_KEY`). File `.env` ini hanya ada di server dan tidak ikut ke Git.
4. Jalankan `docker compose up -d --build`. Backend otomatis menjalankan migrasi dan membuat akun admin pertama.
5. Buka `https://DOMAIN`, login dengan akun admin dari langkah 3, lalu uji email dengan membuat satu akun untuk email Anda sendiri (lihat langkah 5 deploy Railway).

HTTPS wajib, karena di produksi cookie login hanya dikirim lewat HTTPS. Caddy mengurus sertifikatnya sendiri.

| Keperluan | Perintah |
| --- | --- |
| Memperbarui aplikasi | `git pull` lalu `docker compose up -d --build` |
| Melihat log | `docker compose logs -f backend` |
| Cadangan database | `docker compose exec postgres pg_dump -U postgres kominfo_pd_kg > cadangan.sql` |
| Cadangan berkas dokumentasi | `docker run --rm -v kominfo-kegiatan_storage:/data -v "$PWD":/out alpine tar czf /out/storage.tgz -C /data .` |

Data PostgreSQL, berkas dokumentasi, dan sertifikat tersimpan di volume Docker, sehingga tetap aman saat container dibuat ulang. Jangan jalankan `docker compose down -v`, karena perintah itu menghapus volume.

