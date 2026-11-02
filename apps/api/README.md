# Backend Aplikasi Pendataan Kegiatan

Bun + Elysia + Prisma (PostgreSQL) + Better Auth. Dokumentasi endpoint ada di [`../../docs`](../docs/README.md).

## Struktur folder (layered architecture)

Satu permintaan HTTP mengalir dari atas ke bawah:

```
routes  ->  controllers  ->  services  ->  repositories  ->  Prisma (basis data)
```

| Folder | Tugas | Contoh |
| --- | --- | --- |
| `src/routes/` | Daftar URL, siapa yang boleh akses (`auth`), dan validator yang dipakai | `kegiatan.route.ts` |
| `src/validators/` | Aturan isian body/query/params (pesan galat dalam bahasa Indonesia) | `kegiatan.validator.ts` |
| `src/controllers/` | Mengambil data dari request (user, body, params), memanggil service, mengatur status/header HTTP | `kegiatan.controller.ts` |
| `src/services/` | Logika bisnis: aturan hak akses, validasi lanjutan, transaksi, audit log | `kegiatan.service.ts` |
| `src/repositories/` | Semua query ke basis data lewat Prisma. Tidak ada logika bisnis | `kegiatan.repository.ts` |
| `src/types/` | Tipe TypeScript per modul | `kegiatan.types.ts` |
| `src/plugins/` | Plugin Elysia: login (`auth`), galat, koneksi DB, log permintaan | `auth.plugin.ts` |
| `src/lib/` | Koneksi ke layanan luar: Prisma, Better Auth, email, penyimpanan berkas | `prisma.ts` |
| `src/utils/` | Fungsi bantu murni: tanggal WIB, NIP, olah berkas, Excel/PDF | `periode.ts` |
| `src/jobs/` | Tugas latar belakang (email pengingat tiap 15 menit) | `pengingat.job.ts` |
| `prisma/` | Skema basis data, migrasi, dan seed data awal | `schema.prisma` |

Aturan sederhananya: **route** tidak berisi logika, **controller** tidak menyentuh basis data, **repository** tidak berisi aturan bisnis.

Nama modul `user` (`user.route.ts`, `user.service.ts`, ...) adalah manajemen akun di URL `/api/admin/akun`; modul `auth` adalah profil saya di `/api/me`.

## Menjalankan di komputer sendiri

```bash
cp .env.example .env          # isi DATABASE_URL, BETTER_AUTH_SECRET (min. 32 karakter), dll.
bun install                   # otomatis menjalankan `prisma generate`
bun run db:migrate:prod       # menerapkan migrasi ke basis data
bun run db:seed               # unit kerja, jenis kegiatan, dan akun admin awal
bun run dev                   # http://localhost:3001/api
```

## Perintah

| Perintah | Fungsi |
| --- | --- |
| `bun run dev` | Server dengan auto-reload |
| `bun run start` | Produksi: migrasi, hak akses DB, seed, lalu server |
| `bun run typecheck` | Cek tipe TypeScript |
| `bun test` | Menjalankan semua uji di `tests/` (butuh `.env.test`, lihat `.env.test.example`) |
| `bun run db:generate` | Membuat ulang Prisma Client setelah `schema.prisma` diubah |
| `bun run db:migrate` | Membuat migrasi baru dari perubahan `schema.prisma` (development) |
| `bun run db:migrate:prod` | Menerapkan migrasi yang ada (produksi) |
| `bun run db:seed` | Mengisi data awal (aman diulang) |
| `bun run db:studio` | Membuka Prisma Studio untuk melihat isi tabel |

## Pindah dari backend lama (Drizzle) ke Prisma

Struktur tabel tidak berubah, jadi data lama tetap dipakai. Pada basis data yang **sudah pernah** dimigrasi oleh backend lama, tandai migrasi awal Prisma sebagai sudah diterapkan (cukup sekali):

```bash
bunx prisma migrate resolve --applied 0_skema_awal
```

Setelah itu `bun run start` / `bun run db:migrate:prod` berjalan normal. Basis data baru tidak perlu langkah ini.
