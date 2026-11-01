# Aplikasi Pendataan Kegiatan Diskominfo Kota Palembang

Aplikasi web untuk mencatat, memantau, dan melaporkan kegiatan dinas. Pegawai mencatat kegiatan dan dokumentasinya, pimpinan memantau lewat dashboard, kalender, dan rekap, dan admin mengelola pegawai, unit kerja, akun, serta audit log.

| Folder | Isi |
| --- | --- |
| [`apps/api/`](apps/api/README.md) | API REST: Bun, Elysia, Prisma (PostgreSQL), Better Auth. Arsitektur berlapis: route, controller, service, repository |
| [`docs/`](docs/README.md) | Dokumentasi API: header, body, dan respons setiap endpoint |
| [`apps/web/`](apps/web/README.md) | Antarmuka: Next.js 16 (App Router), Tailwind CSS 4, shadcn/ui, TanStack Query, MapLibre GL |
| [`uml/`](uml/README.md) | Diagram UML (use case, activity, sequence, class, ERD, state, component, deployment) |
| [`PANDUAN-KODE.md`](PANDUAN-KODE.md) | **Mulai di sini bila baru membaca kode:** kamus istilah, alur login dan tambah kegiatan, pertanyaan penguji |
| `PRD.md` | Kebutuhan produk (FR, NFR, kriteria penerimaan) |
| `apps/web/DESIGN.md` | Spesifikasi tampilan dan perilaku UI |

## Fitur

| Kebutuhan | Fitur |
| --- | --- |
| FR-01 | Login dengan NIP atau email, penguncian 15 menit setelah 5 kali salah. Akun dibuat admin, diundang lewat email, atau diminta dari halaman login (NIP opsional) |
| FR-02 | Master pegawai (NIP opsional untuk non-ASN, impor Excel dengan templat dan pratinjau), unit kerja dan sub bagian/seksi, jenis unit, jenis kegiatan, dan akun beserta unit kerjanya. Akun yang belum pernah dipakai (mis. salah email) bisa dihapus; yang sudah dipakai dinonaktifkan |
| FR-03 | Audit log append-only (dijaga sampai hak basis data) dengan filter dan nilai sebelum/sesudah |
| FR-04, FR-05 | Catat kegiatan dalam 2 langkah, ubah, isi hasil, batalkan (alasan wajib), dan hapus; status pelaksanaan dihitung otomatis; pengubahan bersamaan dijawab 409 |
| FR-06 | Unggah foto/PDF maks. 20 MB (dicek lewat magic bytes, foto dikompres dan EXIF/GPS dibuang), maks. 10 berkas per kegiatan, unduhan hanya untuk yang login |
| FR-07 | Peta 2D/3D (MapLibre GL + OpenFreeMap), pencarian tempat, nama lokasi terisi otomatis dari titik peta, atau koordinat manual |
| FR-08, FR-10 | Rekap per unit induk dan jenis, ekspor Excel dan PDF berkop dinas |
| FR-09 | Dashboard dinas untuk pimpinan dan admin, dashboard tugas untuk pegawai |
| Tambahan | Kalender, pencarian cepat Ctrl+K, mode gelap, foto profil dan halaman Pengaturan, pengingat email otomatis (H-1 dan dokumentasi) |

**Hak akses.** Pegawai melihat kegiatan unit kerjanya dan mengubah kegiatan miliknya. Pimpinan melihat seluruh dinas tanpa mengubah data. Admin mengelola semuanya. Aturan ditegakkan di backend pada setiap permintaan; kegiatan di luar lingkup dijawab 404.

## Menjalankan untuk pengembangan

Prasyarat: [Bun](https://bun.sh) 1.4, PostgreSQL 17 (mis. lewat Docker, lihat `apps/api/.env.example`), dan Mailpit untuk melihat email (bawaan Laragon, http://localhost:8025).

```bash
# 1. Backend
cd apps/api
bun install
cp .env.example .env            # isi BETTER_AUTH_SECRET dan SEED_ADMIN_PASSWORD
bun run db:migrate:prod         # menerapkan migrasi Prisma
bun run db:seed                 # unit kerja, jenis kegiatan, akun admin
bun run dev                     # http://localhost:3001/api

# 2. Frontend (terminal kedua)
cd apps/web
bun install
bun run dev                     # http://localhost:3000
```

Frontend meneruskan `/api/*` ke backend, sehingga UI dan API berada di satu origin seperti di produksi. Frontend tidak butuh file `.env` saat development; satu-satunya pengaturannya, `API_URL`, dijelaskan di `apps/web/.env.example`.

## Pengujian

```bash
cd apps/web && bun test src     # uji skema form, format tampilan, NIP, dan jam
```

Uji otomatis backend lama belum dibuat ulang untuk backend Prisma yang baru.

Uji backend mencakup kriteria penerimaan PRD bagian 10: penguncian akun, 403 untuk pegawai lain dan pimpinan, 409 pengubahan bersamaan, 422 tanggal terbalik, berkas .exe dan 20,01 MB ditolak, unduhan tanpa login ditolak, audit log untuk setiap aksi, serta angka dashboard, rekap, dan ekspor yang konsisten. Basis data uji dibuat ulang otomatis setiap kali uji dijalankan; uji menolak berjalan bila `DATABASE_URL` tidak berakhiran `_test`.

## Deploy (online lewat Railway dan Vercel)

Aplikasi dipasang di empat layanan. Semuanya cukup diatur lewat klik di situs masing-masing, tanpa server sendiri.

```
Pengguna → Vercel (frontend Next.js) → Railway (backend Elysia) → Railway (MySQL)
                                          ├→ Cloudinary (simpan foto dan dokumen)
                                          └→ Brevo (kirim email undangan dan pengingat)
```

| Bagian | Layanan | Catatan |
| --- | --- | --- |
| Frontend | [Vercel](https://vercel.com) | Gratis. Meneruskan `/api/*` ke backend, jadi cookie login tetap milik domain Vercel |
| Backend | [Railway](https://railway.com) | Dibangun dari `apps/api/Dockerfile`. Setiap kali menyala (`bun run start`), backend menjalankan migrasi tabel dan data awal sendiri |
| MySQL | Railway | Satu klik, alamat koneksinya langsung tersedia untuk backend |
| Berkas | [Cloudinary](https://cloudinary.com) | Paket gratis. Foto dan PDF disimpan privat (tipe *authenticated*), hanya bisa dibuka lewat backend setelah login |
| Email | [Brevo](https://www.brevo.com) | Paket gratis. Railway Hobby memblokir SMTP (termasuk Zoho), jadi email dikirim lewat API Brevo. Alamat Zoho tetap bisa menjadi pengirimnya |

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
2. Buka **Senders, Domains & Dedicated IPs → Senders → Add a sender**, isi email yang akan menjadi pengirim (mis. alamat Zoho dinas), lalu verifikasi lewat email yang masuk ke kotak Zoho tersebut.
3. Buka **SMTP & API → API Keys → Generate a new API key**, lalu salin kuncinya. Simpan, karena hanya ditampilkan sekali.

### Langkah 2b: siapkan Cloudinary (penyimpanan berkas)

1. Daftar gratis di Cloudinary.
2. Di **Dashboard** (atau **Settings → API Keys**), salin **API environment variable**. Bentuknya `cloudinary://API_KEY:API_SECRET@CLOUD_NAME`. Bagian `CLOUDINARY_URL=` di depannya tidak ikut disalin.
3. Buka **Settings → Security**, centang **Allow delivery of PDF and ZIP files**, lalu simpan. Tanpa ini dokumen PDF tidak bisa dibuka.

### Langkah 3: backend dan MySQL di Railway

1. Masuk ke Railway dengan akun GitHub, lalu **New Project → Deploy from GitHub repo** dan pilih repository tadi.
2. Klik layanan yang terbentuk, buka **Settings → Root Directory**, isi `apps/api`. Railway mengenali proyek Bun dari `package.json` dan `bun.lock`.
3. Di kanvas proyek klik **+ Create → Database → MySQL**.
4. Buka tab **Variables** layanan backend, lalu tambahkan (volume tidak diperlukan lagi karena berkas disimpan di Cloudinary):

   | Variable | Isi |
   | --- | --- |
   | `DATABASE_URL` | `${{MySQL.MYSQL_URL}}` (diketik persis begitu; Railway mengisinya otomatis) |
   | `NODE_ENV` | `production` |
   | `BETTER_AUTH_SECRET` | Teks acak minimal 32 karakter, buat di Git Bash dengan `openssl rand -hex 32` |
   | `BETTER_AUTH_URL` | Sementara `https://contoh.vercel.app`, diganti di langkah 5 |
   | `FRONTEND_URL` | Sama dengan `BETTER_AUTH_URL` |
   | `CLOUDINARY_URL` | Nilai dari langkah 2b.2 (`cloudinary://...`) |
   | `SEED_ADMIN_EMAIL` | Email admin pertama |
   | `SEED_ADMIN_PASSWORD` | Sandi admin pertama, minimal 10 karakter |
   | `BREVO_API_KEY` | Kunci dari langkah 2 |
   | `SMTP_FROM` | `Aplikasi Pendataan Kegiatan <alamat-zoho-yang-diverifikasi-di-brevo@domain.go.id>` |

5. Buka **Settings → Networking → Generate Domain**. Anda mendapat alamat seperti `https://xxx.up.railway.app`. Buka `https://xxx.up.railway.app/api/health`; bila tampil `{"status":"ok"}`, backend sudah jalan dan tersambung ke MySQL.

### Langkah 4: frontend di Vercel

1. Masuk ke Vercel dengan akun GitHub, lalu **Add New → Project** dan impor repository yang sama.
2. Isi **Root Directory** dengan `apps/web`. Framework terdeteksi otomatis sebagai Next.js.
3. Di **Environment Variables** tambahkan `API_URL` dengan alamat Railway dari langkah 3.5, tanpa garis miring di akhir.
4. Klik **Deploy**. Setelah selesai Anda mendapat alamat seperti `https://nama-proyek.vercel.app`.

### Langkah 5: sambungkan keduanya

Kembali ke Railway, ubah `BETTER_AUTH_URL` dan `FRONTEND_URL` menjadi alamat Vercel dari langkah 4.4. Railway akan menyalakan ulang backend otomatis. Setelah itu buka alamat Vercel dan login dengan `SEED_ADMIN_EMAIL` dan `SEED_ADMIN_PASSWORD`.

### Memperbarui aplikasi

Cukup `git push`. Vercel dan Railway membangun ulang sendiri, dan migrasi tabel baru berjalan otomatis saat backend menyala.

### Bila ada masalah

| Gejala | Periksa |
| --- | --- |
| Halaman Vercel terbuka tapi login gagal atau "server tidak dapat dihubungi" | `API_URL` di Vercel, dan `BETTER_AUTH_URL`/`FRONTEND_URL` di Railway harus persis alamat Vercel (`https://`, tanpa garis miring di akhir) |
| Backend Railway gagal menyala | Tab **Deployments → View logs**; biasanya ada variable wajib yang belum diisi (pesannya menyebut namanya) |
| Email tidak sampai | `BREVO_API_KEY` dan `SMTP_FROM` (harus sender yang sudah diverifikasi). Periksa juga folder spam |
| Unggah foto gagal | `CLOUDINARY_URL` di Railway (harus diawali `cloudinary://`). Pesan galatnya ada di log backend |
| Dokumen PDF tidak bisa dibuka | Cloudinary **Settings → Security → Allow delivery of PDF and ZIP files** belum dicentang |
| Berkas di atas 10 MB ditolak | Batas paket gratis Cloudinary untuk berkas non-gambar. Perkecil PDF-nya, atau naikkan paket Cloudinary |

## Deploy ke VPS dengan Docker

Alternatif dari Railway + Vercel bila aplikasi dipasang di VPS sendiri (mis. server Diskominfo). Satu `docker compose` menjalankan empat container: MySQL, backend (`apps/api/Dockerfile`), frontend (`apps/web/Dockerfile`), dan Caddy (`Caddyfile`) sebagai pintu masuk HTTPS. Hanya Caddy yang membuka port ke luar (80 dan 443).

1. Pasang Docker di VPS, lalu salin proyek ini ke sana (`git clone`).
2. Arahkan DNS domain (mis. `kegiatan.palembang.go.id`) ke IP VPS. Belum punya domain? Pakai IP VPS dulu (peramban akan memberi peringatan sertifikat).
3. Di root proyek: `cp docker.env.example .env`, lalu isi `DOMAIN`, `DB_PASSWORD`, `DB_ROOT_PASSWORD`, `BETTER_AUTH_SECRET`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, dan pengaturan email.
4. Jalankan `docker compose up -d --build`. Backend otomatis menjalankan migrasi dan membuat akun admin pertama.
5. Buka `https://DOMAIN` dan login dengan akun admin dari langkah 3.

HTTPS wajib, karena di produksi cookie login hanya dikirim lewat HTTPS. Caddy mengurus sertifikatnya sendiri.

| Keperluan | Perintah |
| --- | --- |
| Memperbarui aplikasi | `git pull` lalu `docker compose up -d --build` |
| Melihat log | `docker compose logs -f backend` |
| Cadangan database | `docker compose exec mysql sh -c 'mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" kominfo_pd_kg' > cadangan.sql` |
| Cadangan berkas dokumentasi | `docker run --rm -v kominfo-kegiatan_storage:/data -v "$PWD":/out alpine tar czf /out/storage.tgz -C /data .` |

Data MySQL, berkas dokumentasi, dan sertifikat tersimpan di volume Docker, sehingga tetap aman saat container dibuat ulang. Jangan jalankan `docker compose down -v`, karena perintah itu menghapus volume.

## Keputusan yang masih menunggu dinas

- Bagan organisasi resmi (O5) dan daftar jenis kegiatan resmi (O6): data seed masih contoh dari situs dinas.
- Alamat dan format kop surat untuk ekspor PDF.
- Lokasi hosting dan domain produksi (O4). Railway dan Vercel tidak punya server di Indonesia, padahal NFR-07 mensyaratkannya; cocok untuk demo, perlu diputuskan sebelum dipakai resmi.
- PRD menyebut PostgreSQL; proyek memakai MySQL 8 atas keputusan pemilik proyek.
