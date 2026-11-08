# Backend Aplikasi Pendataan Kegiatan

Bun + Elysia + Drizzle (PostgreSQL) + Better Auth. Dokumentasi endpoint ada di [`docs/api`](../../docs/api/README.md).

## Struktur folder (layered architecture)

Satu permintaan HTTP mengalir dari atas ke bawah:

```
routes  ->  controllers  ->  services  ->  repositories  ->  Drizzle (basis data)
```

| Folder | Tugas | Contoh |
| --- | --- | --- |
| `src/routes/` | Daftar URL, siapa yang boleh akses (`auth`), dan validator yang dipakai | `kegiatan.route.ts` |
| `src/validators/` | Aturan isian body/query/params (pesan galat dalam bahasa Indonesia) | `kegiatan.validator.ts` |
| `src/controllers/` | Mengambil data dari request (user, body, params), memanggil service, mengatur status/header HTTP | `kegiatan.controller.ts` |
| `src/services/` | Logika bisnis: aturan hak akses, validasi lanjutan, transaksi | `kegiatan.service.ts` |
| `src/repositories/` | Semua query ke basis data lewat Drizzle, ditulis mirip SQL. Tidak ada logika bisnis | `kegiatan.repository.ts` |
| `src/types/` | Tipe TypeScript per modul | `kegiatan.types.ts` |
| `src/plugins/` | Plugin Elysia: login (`auth`), galat, koneksi DB, log permintaan | `auth.plugin.ts` |
| `src/lib/` | Koneksi ke layanan luar: basis data, Better Auth, email, penyimpanan berkas | `db.ts` |
| `src/utils/` | Fungsi bantu murni: tanggal WIB, NIP, olah berkas, PDF | `periode.ts` |
| `src/jobs/` | Tugas latar belakang (email pengingat tiap 15 menit) | `pengingat.job.ts` |
| `src/db/` | Skema tabel Drizzle | `schema.ts` |
| `drizzle/` | Riwayat migrasi SQL | `0009_hapus_audit_log.sql` |
| `scripts/` | Migrasi, seed data awal, dan hak akses basis data | `migrate.ts` |

Aturan sederhananya: **route** tidak berisi logika, **controller** tidak menyentuh basis data, **repository** tidak berisi aturan bisnis.

Nama modul `user` (`user.route.ts`, `user.service.ts`, ...) adalah manajemen akun di URL `/api/admin/akun`; modul `auth` adalah profil saya di `/api/me`.

## Menjalankan di komputer sendiri

```bash
cp .env.example .env          # isi DATABASE_URL, BETTER_AUTH_SECRET (min. 32 karakter), dll.
bun install
bun run db:migrate            # menerapkan migrasi ke basis data
bun run db:seed               # bidang, jenis kegiatan, dan akun admin awal
bun run dev                   # http://localhost:3001/api
```

## Perintah

| Perintah | Fungsi |
| --- | --- |
| `bun run dev` | Server dengan auto-reload |
| `bun run start` | Produksi: migrasi, hak akses DB, seed, lalu server |
| `bun run typecheck` | Cek tipe TypeScript |
| `bun test` | Menjalankan semua uji di `tests/` (butuh `.env.test`, lihat `.env.test.example`) |
| `bun run db:generate` | Membuat file migrasi SQL baru dari perubahan `src/db/schema.ts` |
| `bun run db:migrate` | Menerapkan migrasi yang ada ke basis data |
| `bun run db:seed` | Mengisi data awal (aman diulang) |
| `bun run db:studio` | Membuka Drizzle Studio untuk melihat isi tabel |
