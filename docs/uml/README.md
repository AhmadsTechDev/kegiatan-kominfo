# Diagram UML

Diagram Aplikasi Pendataan Kegiatan Diskominfo Kota Palembang, ditulis dengan [Mermaid](https://mermaid.js.org) sehingga tampil langsung di GitHub dan di VS Code (pratinjau Markdown, atau ekstensi *Markdown Preview Mermaid Support*). Isinya diturunkan dari kode: skema `apps/api/prisma/schema.prisma`, route di `apps/api/src/routes/`, dan service di `apps/api/src/services/`. Bila kode berubah, perbarui diagram yang terkait.

| No | Diagram | Isi |
| --- | --- | --- |
| 1 | [Use case](01-use-case.md) | Aktor (Pegawai, Pimpinan, Admin, Tamu, Penjadwal) dan apa yang bisa dilakukan masing-masing |
| 2 | [Activity](02-activity.md) | Alur mencatat kegiatan sampai dokumentasi, dan alur akun dari permintaan sampai aktif |
| 3 | [Sequence](03-sequence.md) | Login dengan penguncian akun, aktivasi akun lewat email, unggah dokumentasi |
| 4 | [Class](04-class.md) | Kelas domain dan lapisan backend (route, controller, service, repository) |
| 5 | [ERD](05-erd.md) | Tabel PostgreSQL beserta relasinya |
| 6 | [State](06-state.md) | Status pelaksanaan dan pemeriksaan kegiatan, status akun, status permintaan akun |
| 7 | [Component](07-component.md) | Komponen frontend, backend, dan layanan luar |
| 8 | [Deployment](08-deployment.md) | Railway + Vercel, dan alternatif VPS dengan Docker Compose |

Istilah yang dipakai di diagram mengikuti kode: *unit kerja* adalah bidang atau sub bidang, *pegawai* adalah data kepegawaian (terpisah dari akun login), dan *akun* adalah tabel `user`.
