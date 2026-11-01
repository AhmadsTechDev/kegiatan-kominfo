# Frontend: Aplikasi Pendataan Kegiatan Diskominfo Kota Palembang

Next.js 16 (App Router, `cacheComponents`, React Compiler), Tailwind CSS 4, shadcn/ui, TanStack Query dan Table, React Hook Form + Zod, Recharts, dan MapLibre GL (peta vektor 3D). Aturan kerja ada di `AGENTS.md`, spesifikasi tampilan di `DESIGN.md`.

## Menjalankan

```bash
bun install
bun run dev        # http://localhost:3000, /api/* diteruskan ke http://localhost:3001 (API_URL)
```

| Script | Fungsi |
| --- | --- |
| `dev` | Server pengembangan |
| `build` / `start` | Build dan jalankan produksi (di Vercel `build` dijalankan otomatis) |
| `lint` | ESLint (aturan Next.js dan React Compiler) |
| `typecheck` | `tsc --noEmit` |
| `test` | Uji unit Bun untuk skema form dan format tampilan (`src/**/*.test.ts`) |

## Struktur

```
src/
  app/                 routing saja: (auth)/login, minta-akun, aktivasi; (app)/dashboard, kegiatan, kalender, rekap, admin/*
                       not-found, error, global-error, icon.png
  components/ui/       komponen shadcn (tidak diubah langsung)
  components/shared/   komponen lintas fitur: DataTable, Panel, StatCard, StatusBadge, FilterBar, FileDropzone, MapPicker, ...
  components/layout/   AppShell (sidebar mengambang, topbar, breadcrumb), menu pengguna, tema
  features/<fitur>/    api/, hooks/, components/, schemas/, types.ts per fitur:
                       auth, dashboard, kegiatan, kalender, rekap, admin, pencarian
  lib/                 api-client (axios, pemetaan error), format (tanggal WIB, angka id-ID), auth-client
  proxy.ts             redirect berdasarkan cookie sesi saja; otorisasi sebenarnya di backend
```

## Aturan penting

- **Otorisasi di backend.** Menyembunyikan tombol hanya kemudahan; setiap aksi diperiksa ulang API (NFR-03). Petunjuk `bisaUbah` datang dari backend.
- **Waktu selalu WIB.** Semua format lewat `lib/format.ts` dengan zona Asia/Jakarta; form mengirim waktu ISO berzona `+07:00`.
- **Status pelaksanaan tidak dihitung di klien.** Nilainya datang dari backend.
- **Empat keadaan.** Setiap layar data menangani memuat (skeleton), kosong, error (dengan "Coba lagi"), dan berhasil (toast).
- **Gerak** hanya `transform` dan `opacity` dan menghormati `prefers-reduced-motion` (DESIGN.md bagian 8).
- **Dark mode** lewat `next-themes` (kelas `.dark`); semua warna memakai token di `app/globals.css`.

## Fitur antarmuka

- Sidebar mengambang dengan menu per role, lencana permintaan akun untuk admin, dan mode ikon.
- Pencarian cepat **Ctrl/⌘ + K**: lompat ke menu, aksi, atau kegiatan (judul dan lokasi) sesuai lingkup role.
- Dashboard dinas untuk pimpinan dan admin; dashboard pegawai berisi sapaan, tugas (perlu dokumentasi, agenda), dan agenda unit 7 hari.
- Form kegiatan dengan peta, daftar periksa langsung, dan unggah dokumentasi (dikompresi di peramban, maks. sisi 1920 px).
- Halaman detail dengan galeri dan pratinjau dokumentasi serta riwayat perubahan yang diringkas.
