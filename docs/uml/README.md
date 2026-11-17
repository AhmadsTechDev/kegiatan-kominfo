# Diagram UML

Diagram Aplikasi Pendataan Kegiatan Diskominfo Kota Palembang, diselaraskan dengan Bab 4 Laporan Kerja Praktek dan ditulis menggunakan [Mermaid](https://mermaid.js.org) sehingga tampil langsung di GitHub maupun VS Code (pratinjau Markdown atau ekstensi *Markdown Preview Mermaid Support*). Isinya diturunkan dari kode: skema `apps/api/src/db/schema.ts`, route di `apps/api/src/routes/`, dan service di `apps/api/src/services/`.

| No | Diagram | Isi | Rujukan Laporan KP |
| --- | --- | --- | --- |
| 1 | [Use case](01-use-case.md) | Aktor (Tamu, Pegawai, Pimpinan, Admin, Penjadwal) dan 14 use case sistem | Subbab 4.7.1 (`Gambar 4.2`, `Tabel 4.7`–`4.8`) |
| 2 | [Activity](02-activity.md) | Alur login, mencatat kegiatan sampai dokumentasi, memeriksa kegiatan, dan membuat laporan PDF | Subbab 4.7.2 (`Gambar 4.3`–`4.6`) |
| 3 | [Sequence](03-sequence.md) | Login dengan penguncian akun, aktivasi akun lewat email, unggah dokumentasi | Subbab 4.7.3 (`Gambar 4.7`–`4.9`) |
| 4 | [Deployment](04-deployment.md) | Render, Supabase, dan Vercel | Subbab 4.7.4 (`Gambar 4.10`) |
| 5 | [ERD](05-erd.md) | 15 tabel PostgreSQL beserta relasinya | Subbab 4.8.1 (`Gambar 4.11`) |
| 6 | [Arsitektur sistem](06-arsitektur.md) | Komponen frontend, backend, dan layanan luar | Subbab 4.6.4 (`Gambar 4.1`) |

Istilah yang dipakai di diagram mengikuti kode: tabel `bidang` berisi bidang dan sub bidang (sub bidang menaut ke bidang lewat `parent_id`; tanpa induk berarti bidang), *pegawai* adalah data kepegawaian (terpisah dari akun login), dan *akun* adalah tabel `user`.
