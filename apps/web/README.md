# Frontend: Aplikasi Pendataan Kegiatan Diskominfo Kota Palembang

Antarmuka web aplikasi. Kembali ke [README utama](../../README.md). Backend-nya ada di [apps/api](../api/README.md), dokumentasi endpoint di [docs/api](../../docs/api/README.md), dan diagram di [docs/uml](../../docs/uml/README.md).

| Teknologi | Dipakai untuk |
| --- | --- |
| Next.js 16 (App Router, `cacheComponents`, React Compiler) | Routing dan render halaman |
| Tailwind CSS 4, shadcn/ui (Radix), lucide-react | Tampilan, komponen dasar, ikon |
| TanStack Query dan TanStack Table | Pengambilan data dengan cache, dan tabel |
| React Hook Form dan Zod | Formulir dan validasi |
| Better Auth (klien) | Login, logout, dan membaca sesi |
| Axios | Klien HTTP ke API |
| MapLibre GL (ubin OpenFreeMap) | Peta 2D dan 3D |
| Recharts | Grafik di dashboard dan rekap |
| next-themes, sonner, date-fns | Tema gelap, notifikasi toast, format tanggal |

## Menjalankan

Prasyarat: [Bun](https://bun.sh) 1.4, dan backend berjalan di `http://localhost:3001` (lihat [README utama](../../README.md#menjalankan-untuk-pengembangan)).

```bash
cd apps/web
bun install
bun run dev        # http://localhost:3000
```

Saat pengembangan tidak perlu file `.env`. Satu-satunya pengaturan adalah `API_URL` (alamat backend, bawaan `http://localhost:3001`), dijelaskan di [.env.example](.env.example). Di produksi (Vercel) isi lewat **Settings → Environment Variables**, tanpa garis miring di akhir.

| Script | Fungsi |
| --- | --- |
| `dev` | Server pengembangan |
| `build` dan `start` | Build dan jalankan produksi (di Vercel, `build` dijalankan otomatis) |
| `lint` | ESLint (aturan Next.js dan React Compiler) |
| `typecheck` | `tsc --noEmit` |
| `test` | Uji unit Bun (`bun test src`): skema form, format tampilan, NIP, jam, dan kebijakan kata sandi. Saat ini 28 uji |

Sebelum push, jalankan `bun run typecheck`, `bun run lint`, dan `bun run test`.

## Halaman

Semua halaman memakai bahasa Indonesia. Menu yang terlihat bergantung pada peran (`config/navigation.ts`).

| Alamat | Halaman | Peran |
| --- | --- | --- |
| `/login` | Masuk dengan email dan sandi | Publik |
| `/minta-akun` | Ajukan permintaan akun ke admin | Publik |
| `/aktivasi` | Buat sandi dari tautan undangan | Publik (token) |
| `/lupa-sandi`, `/reset-sandi` | Minta tautan dan atur ulang sandi | Publik |
| `/konfirmasi-email` | Verifikasi email baru dari tautan | Publik (token) |
| `/dashboard` | Dashboard dinas (pimpinan, admin) atau dashboard tugas (pegawai) | Semua peran |
| `/kegiatan` | Daftar kegiatan dengan pencarian dan filter; pegawai memakai pintasan "Kegiatan bidang saya" dan "Kegiatan saya" | Semua peran |
| `/kegiatan/baru` | Catat kegiatan dalam dua langkah, atau lanjutkan draf | Pegawai, Admin |
| `/kegiatan/[id]` | Detail, dokumentasi, peta, dan riwayat pemeriksaan | Sesuai lingkup baca |
| `/kegiatan/[id]/ubah` | Ubah kegiatan dan isi hasil | Pemilik, Admin |
| `/kalender` | Kalender bulanan | Semua peran |
| `/rekap` | Rekap jumlah per unit induk dan jenis | Semua peran |
| `/laporan` | Pilih rentang, pratinjau, dan unduh PDF | Semua peran |
| `/pantau` | Pantau dan periksa kegiatan | Pimpinan |
| `/admin/akun`, `/admin/akun/[id]` | Manajemen akun, permintaan akses, dan detail akun | Admin |
| `/admin/master` | Pegawai, bidang dan sub bidang, jenis unit, jenis kegiatan | Admin |
| `/admin/audit-log` | Audit log dengan filter | Admin |
| `/pengaturan` | Profil, kontak, email, sandi, sesi aktif, dan preferensi | Semua peran |

`proxy.ts` hanya mengarahkan berdasarkan **keberadaan cookie sesi**: tanpa cookie, halaman non-publik dialihkan ke `/login?next=...`; sudah login, `/login` dialihkan ke `/dashboard`. Otorisasi sebenarnya ada di backend.

## Struktur

```
src/
  app/                  Routing saja
    (auth)/             login, minta-akun, aktivasi, lupa-sandi, reset-sandi, konfirmasi-email
    (app)/              dashboard, kegiatan, kalender, rekap, laporan, pantau, pengaturan, admin/*
    globals.css         token warna dan tema (terang, gelap, aksen pimpinan)
    layout.tsx, providers.tsx, not-found.tsx, global-error.tsx
  components/
    ui/                 Komponen shadcn (tidak diubah langsung)
    shared/             Lintas fitur: DataTable, Panel, PageHeader, StatCard, StatusBadge, FilterBar,
                        PilihCari, FileDropzone, MapPicker, MapOverview, ConfirmDialog, EmptyState, ErrorState, ...
    layout/             AppShell (sidebar, topbar, breadcrumb), menu pengguna, pengalih tema
  features/<fitur>/     Satu folder per fitur, isinya api/, hooks/, components/, schemas/, types.ts
                        Fitur: auth, dashboard, kegiatan, kalender, rekap, laporan, pantau,
                        pencarian, pengaturan, admin
  config/               navigation.ts (menu per peran), site.ts
  hooks/                Pembantu kecil: sapaan, count-up, periode sekarang, prefers-reduced-motion
  lib/                  api-client, auth-client, query-client, format, nip, sandi, utils
  types/                Tipe bersama (peran, status akun)
  proxy.ts              Pengarah berdasarkan cookie sesi
public/images/          Logo
```

Pola per fitur: `api/` berisi fungsi pemanggil endpoint, `hooks/` membungkusnya dengan TanStack Query, `components/` berisi tampilan, dan `schemas/` berisi skema Zod formulir. Halaman di `app/` hanya merangkai komponen dari `features/`.

## Cara frontend memanggil API

```
Komponen → hook (TanStack Query) → features/<fitur>/api → lib/api-client (axios)
                                                              │  /api/*
                                          next.config.ts rewrite → API_URL (backend)
```

- **Satu origin.** `next.config.ts` meneruskan `/api/:path*` ke `API_URL`. Peramban hanya bicara dengan domain frontend, sehingga cookie sesi milik domain itu dan tidak ada urusan CORS.
- **Klien HTTP** (`lib/api-client.ts`) mengirim cookie sesi, memetakan galat API (`code`, `message`, `details[]`) menjadi `ApiError`, dan pada status **401** mengalihkan ke `/login?sesi=berakhir` dengan muat ulang penuh agar seluruh state lama bersih.
- **Cache data.** `lib/query-client.ts` menetapkan data segar selama 30 detik dan membatasi percobaan ulang.
- **Header keamanan** (X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy) dipasang di `next.config.ts`; HTTPS dan HSTS diurus Vercel atau Caddy.

## Aturan penting

- **Otorisasi di backend.** Menyembunyikan tombol hanya kemudahan; setiap aksi diperiksa ulang API. Petunjuk seperti `bisaUbah` dan `bisaPeriksa` datang dari backend.
- **Waktu selalu WIB.** Semua format lewat `lib/format.ts` dengan zona Asia/Jakarta; form mengirim waktu ISO berzona `+07:00`.
- **Status tidak dihitung di klien.** Status pelaksanaan dan status akun datang dari backend. Lencana pemeriksaan "Belum diperiksa" tidak ditampilkan di daftar dan detail kegiatan, karena pemeriksaan pimpinan bersifat opsional.
- **Empat keadaan.** Setiap layar data menangani memuat (skeleton), kosong, galat (dengan "Coba lagi"), dan berhasil (toast).
- **Gerak** hanya `transform` dan `opacity`, dan menghormati `prefers-reduced-motion`.
- **Teks seperlunya.** Hindari kalimat penjelas yang tidak menambah informasi; judul dan label sudah cukup.
- **Aksesibilitas.** Area sentuh minimal 44 px di layar sentuh (`pointer-coarse:`), teks tidak di bawah 12 px, status selalu memakai teks (tidak hanya warna), dan seluruh alur utama bisa dilalui dengan keyboard.
- **Responsif.** Tabel berubah menjadi daftar kartu di bawah lebar `md`.

## Tema dan tampilan

- **Mode gelap** lewat `next-themes` (kelas `.dark`). Semua warna memakai token di `app/globals.css`, tidak ada warna tertulis langsung di komponen.
- **Aksen per peran.** Atribut `data-peran="pimpinan"` pada `<html>` mengganti token aksen menjadi emas, sehingga tampilan pimpinan langsung terasa berbeda dari pegawai dan admin.
- **Peta.** MapLibre GL dengan ubin OpenFreeMap, dalam bentuk 2D atau 3D. Nama lokasi terisi otomatis dari titik yang dipilih (geokode), dan koordinat bisa diisi manual.
- **Dokumentasi** foto dikompres di peramban sebelum diunggah (sisi terpanjang maksimal 1920 px).

## Fitur antarmuka

- Sidebar mengambang dengan menu per peran, lencana jumlah permintaan akun yang menunggu (admin), dan mode ikon.
- Pencarian cepat **Ctrl/⌘ + K**: lompat ke menu, aksi, atau kegiatan (judul dan lokasi) sesuai lingkup peran.
- Dashboard dinas untuk pimpinan dan admin. Dashboard pegawai berisi sapaan, tugas (perlu dokumentasi, agenda), dan agenda bidang 7 hari.
- Formulir kegiatan dua langkah dengan peta, daftar periksa langsung, simpan draf, dan unggah dokumentasi.
- Halaman detail dengan galeri dan pratinjau dokumentasi, peta lokasi, dan riwayat perubahan serta pemeriksaan.
- Kalender bulanan dengan penyaringan per bidang dan panel agenda per tanggal.
- Pantau untuk pimpinan dengan pencarian dan pemilih pegawai yang tetap ringan untuk ratusan pegawai (`PilihCari`).
- Manajemen akun dengan tab Akun, Belum punya akun, Nonaktif, dan Permintaan akses; aksi undang, nonaktifkan, reset sandi, dan hapus.
- Pengaturan: profil dan foto, kontak, ganti email dengan verifikasi, ganti sandi, sesi aktif (keluarkan satu atau semua perangkat lain), tema, dan notifikasi pengingat.

## Menambah halaman atau fitur

1. Buat folder `src/features/<fitur>/` dengan `api/`, `hooks/`, dan `components/` (tambahkan `schemas/` bila ada formulir).
2. Panggil endpoint lewat `lib/api-client`, dan bungkus dengan hook TanStack Query.
3. Buat halamannya di `src/app/(app)/<alamat>/page.tsx` dan rangkai komponen dari fitur.
4. Daftarkan menunya di `config/navigation.ts` dengan peran yang berhak. Menyembunyikan menu bukan pengamanan: pastikan endpoint di backend juga membatasi peran.
5. Tangani empat keadaan (memuat, kosong, galat, berhasil), lalu jalankan `typecheck`, `lint`, dan `test`.

## Deploy

- **Vercel:** Root Directory `apps/web`, satu variabel `API_URL`. Langkah lengkapnya di [README utama](../../README.md#langkah-4-frontend-di-vercel).
- **VPS dengan Docker:** `apps/web/Dockerfile` membangun keluaran `standalone` (`NEXT_OUTPUT=standalone`), dijalankan lewat `docker compose` di root bersama backend dan Caddy.
