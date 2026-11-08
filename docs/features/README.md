# Spesifikasi fitur

Tiap berkas berisi spesifikasi satu fitur: tujuan, kriteria selesai per sub-fitur, dan daftar tugas pengerjaannya. Kembali ke [README utama](../../README.md). Rincian endpoint ada di [dokumentasi API](../api/README.md), dan alurnya di [diagram UML](../uml/README.md).

| Berkas | Fitur | Dipakai oleh | Endpoint utama |
| --- | --- | --- | --- |
| [01-catat-kegiatan.md](01-catat-kegiatan.md) | Mencatat kegiatan dalam dua langkah, waktu dan lokasi, jenis kegiatan, simpan draf | Pegawai, Admin | `POST /api/kegiatan`, `/api/draf-kegiatan` |
| [02-daftar-kegiatan.md](02-daftar-kegiatan.md) | Daftar kegiatan, pencarian cepat, filter tanggal dan bidang, detail kegiatan | Semua peran | `GET /api/kegiatan`, `GET /api/kegiatan/:id` |
| [03-bukti-foto-dokumen.md](03-bukti-foto-dokumen.md) | Unggah, pratinjau, ganti, dan hapus foto atau PDF dokumentasi | Pegawai, Admin (unduh: semua peran) | `/api/kegiatan/:id/dokumentasi`, `/api/dokumentasi/:id` |
| [04-rekap-otomatis.md](04-rekap-otomatis.md) | Rekap per periode dan per bidang, ringkasan angka, grafik tren | Semua peran | `GET /api/rekap`, `GET /api/dashboard` |
| [05-cetak-unduh-laporan.md](05-cetak-unduh-laporan.md) | Pilih rentang, pratinjau, dan unduh PDF berkop dinas | Semua peran | `GET /api/ekspor/*` |
| [06-pantau-pimpinan.md](06-pantau-pimpinan.md) | Memantau kegiatan dan menandai yang perlu perbaikan | Pimpinan | `GET /api/pantau/ringkasan`, `POST /api/kegiatan/:id/pemeriksaan` |
| [07-masuk-kelola-akun.md](07-masuk-kelola-akun.md) | Login, kelola akun dan peran, profil dan Pengaturan | Semua peran (kelola akun: Admin) | `/api/auth/*`, `/api/me`, `/api/admin/akun` |

Fitur yang tidak punya berkas tersendiri (kalender, master data, permintaan akun, pengingat email) dijelaskan di [README utama](../../README.md#fitur) dan [dokumentasi API](../api/README.md).
