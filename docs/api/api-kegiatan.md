# API Kegiatan, Draf, dan Dokumentasi

Kembali ke [ringkasan](README.md).

Semua endpoint di sini butuh header `Cookie` (sudah login).

**Aturan hak akses kegiatan**

- `PEGAWAI` hanya melihat kegiatan di bidangnya (termasuk sub-unit) dan kegiatan miliknya. Kegiatan di luar itu dijawab 404.
- `PEGAWAI` hanya bisa mengubah kegiatan yang dibuatnya atau yang dia tanggung jawabi, dan hanya bisa mencatat kegiatan dengan dirinya sebagai penanggung jawab.
- `ADMIN` bisa mengubah semua kegiatan. `PIMPINAN` hanya membaca dan memeriksa.

**Status pelaksanaan** (`statusPelaksanaan`) dihitung dari waktu sekarang, tidak disimpan:

| Nilai | Arti |
| --- | --- |
| `akan_datang` | Belum mulai |
| `berlangsung` | Sedang berjalan |
| `selesai` | Sudah lewat waktu selesai |
| `dibatalkan` | Dibatalkan (tetap tersimpan) |

**Status pemeriksaan** (`statusPemeriksaan`): `terkirim` (belum diperiksa), `diperiksa`, `perlu_perbaikan`. Setiap kali kegiatan diubah, statusnya kembali `terkirim`.

---

## Referensi (pilihan formulir)

### `GET /api/referensi`

Data untuk pilihan di formulir dan filter.

**Akses**: Login

**Respons 200**

```json
{
  "bidang": [
    { "id": 4, "parentId": null, "kode": "BID-TIP", "nama": "Bidang Teknologi Informasi dan Persandian", "aktif": true },
    { "id": 10, "parentId": 4, "kode": "SEKSI-DATA", "nama": "Seksi Pengelolaan Data dan Persediaan", "aktif": true }
  ],
  "jenisKegiatan": [{ "id": 1, "nama": "Rapat" }],
  "pegawai": [{ "id": 1, "nama": "Andi Saputra", "jabatan": "Analis Data", "bidangId": 10 }]
}
```

`bidang` berisi semua unit (aktif dan nonaktif). `jenisKegiatan` dan `pegawai` hanya yang aktif. NIP pegawai sengaja tidak disertakan.

---

## Kegiatan

### `GET /api/kegiatan`

Daftar kegiatan, terbaru (tanggal mulai) di atas.

**Akses**: Login

**Query** (semua opsional)

| Field | Tipe | Keterangan |
| --- | --- | --- |
| `unit` | angka | Id bidang; sub-unitnya ikut tercakup |
| `jenis` | angka | Id jenis kegiatan |
| `pegawai` | angka | Id pegawai penanggung jawab |
| `status` | `akan_datang` \| `berlangsung` \| `selesai` \| `dibatalkan` | Status pelaksanaan |
| `pemeriksaan` | `terkirim` \| `diperiksa` \| `perlu_perbaikan` | Status pemeriksaan |
| `periode` | `YYYY-MM` | Kegiatan yang mulai di bulan ini (WIB) |
| `dari` | `YYYY-MM-DD` | Mulai pada/setelah tanggal ini. Bila `dari`/`sampai` diisi, `periode` diabaikan |
| `sampai` | `YYYY-MM-DD` | Mulai pada/sebelum tanggal ini |
| `q` | string | Cari di judul, lokasi, atau uraian (tidak peka huruf besar/kecil). Maks. 100 karakter |
| `milik` | `saya` | Hanya kegiatan yang saya buat atau saya tanggung jawabi |
| `page` | angka | Bawaan 1 |
| `pageSize` | angka | 1–100, bawaan 20 |

Contoh: `GET /api/kegiatan?periode=2026-11&status=selesai&page=1`

**Respons 200**

```json
{
  "items": [
    {
      "id": 1,
      "judul": "Rapat koordinasi data",
      "tglMulai": "2026-10-30T22:10:53.043Z",
      "tglSelesai": "2026-10-31T00:10:53.043Z",
      "lokasiNama": "Ruang rapat",
      "bidang": { "id": 10, "nama": "Seksi Pengelolaan Data dan Persediaan" },
      "jenis": { "id": 1, "nama": "Rapat" },
      "penanggungJawab": { "id": 1, "nama": "Andi Saputra" },
      "statusPemeriksaan": "perlu_perbaikan",
      "statusPelaksanaan": "selesai",
      "updatedAt": "2026-11-01T22:10:53.394Z",
      "bisaUbah": true
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 20
}
```

`bisaUbah` menandai apakah pengguna yang login boleh mengubah kegiatan itu.

**Galat**: 422 bila query tidak valid atau `dari` setelah `sampai`.

### `GET /api/kegiatan/:id`

Detail kegiatan.

**Akses**: Login (di luar hak baca dijawab 404)

**Respons 200**

```json
{
  "id": 1,
  "judul": "Rapat koordinasi data",
  "uraian": null,
  "hasil": null,
  "tglMulai": "2026-10-30T22:10:53.043Z",
  "tglSelesai": "2026-10-31T00:10:53.043Z",
  "lokasiNama": "Ruang rapat",
  "lat": -2.976074,
  "lng": 104.775431,
  "jumlahPeserta": 12,
  "refEksternal": null,
  "dibatalkanAt": null,
  "alasanBatal": null,
  "jenis": { "id": 1, "nama": "Rapat" },
  "bidang": { "id": 10, "nama": "Seksi Pengelolaan Data dan Persediaan" },
  "unitInduk": { "id": 4, "nama": "Bidang Teknologi Informasi dan Persandian" },
  "penanggungJawab": { "id": 1, "nama": "Andi Saputra", "jabatan": "Analis Data" },
  "pembuat": { "id": "07747c26-fd62-4ab6-8584-ebf7b244fc3a", "nama": "Andi Saputra" },
  "statusPelaksanaan": "selesai",
  "statusPemeriksaan": "perlu_perbaikan",
  "createdAt": "2026-11-01T22:10:53.110Z",
  "updatedAt": "2026-11-01T22:10:53.394Z",
  "dokumentasi": [{ "id": 1, "namaAsli": "foto.png", "mime": "image/png", "ukuran": 91, "createdAt": "2026-11-01T22:10:53.598Z" }],
  "pengubahTerakhir": { "nama": "Andi Saputra", "waktu": "2026-11-01T22:10:53.404Z" },
  "riwayat": [
    { "id": 11, "aksi": "unggah", "aktor": "Andi Saputra", "waktu": "2026-11-01T22:10:53.603Z" },
    { "id": 9, "aksi": "ubah", "aktor": "Andi Saputra", "waktu": "2026-11-01T22:10:53.404Z" },
    { "id": 7, "aksi": "buat", "aktor": "Andi Saputra", "waktu": "2026-11-01T22:10:53.123Z" }
  ],
  "catatanPemeriksaan": [
    { "id": 1, "status": "perlu_perbaikan", "isi": "Lengkapi hasil", "pemeriksa": "Administrator", "waktu": "2026-11-01T22:10:53.498Z" }
  ],
  "bisaPeriksa": true,
  "bisaUbah": true
}
```

| Field | Keterangan |
| --- | --- |
| `unitInduk` | Unit di atas `bidang`; `null` bila bidangnya sudah unit tertinggi |
| `pengubahTerakhir` | Terakhir diubah/dibatalkan; `null` bila belum pernah |
| `riwayat` | 20 aksi terakhir pada kegiatan dan dokumentasinya |
| `updatedAt` | **Versi data.** Kirim kembali sebagai `expectedUpdatedAt` saat mengubah atau membatalkan |

### `POST /api/kegiatan`

Mencatat kegiatan baru. Bidang kegiatan otomatis mengikuti bidang penanggung jawab.

**Akses**: PEGAWAI, ADMIN

**Header**: `Cookie`, `Content-Type: application/json`

**Body**

| Field | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `judul` | string | ya | 1–200 karakter |
| `jenisId` | angka | ya | Id jenis kegiatan aktif |
| `penanggungJawabId` | angka | ya | Id pegawai aktif. PEGAWAI wajib mengisi dirinya sendiri |
| `tglMulai` | string | ya | Waktu ISO 8601, contoh `2026-11-05T09:00:00+07:00` |
| `tglSelesai` | string | ya | Tidak boleh sebelum `tglMulai` |
| `uraian` | string \| null | tidak | Maks. 5.000 karakter |
| `hasil` | string \| null | tidak | Maks. 5.000 karakter |
| `jumlahPeserta` | angka \| null | tidak | 0–100.000 |
| `lokasiNama` | string \| null | tidak | Maks. 255 karakter |
| `lat` | angka \| null | tidak | -90 sampai 90. Wajib berpasangan dengan `lng` |
| `lng` | angka \| null | tidak | -180 sampai 180 |
| `refEksternal` | string \| null | tidak | Nomor surat/referensi, maks. 255 karakter |
| `drafId` | angka | tidak | Bila diisi, draf ini dihapus setelah kegiatan tersimpan |

```json
{
  "judul": "Rapat koordinasi data",
  "jenisId": 1,
  "penanggungJawabId": 1,
  "tglMulai": "2026-11-05T09:00:00+07:00",
  "tglSelesai": "2026-11-05T11:00:00+07:00",
  "lokasiNama": "Ruang rapat lt. 2",
  "lat": -2.976074,
  "lng": 104.775431,
  "jumlahPeserta": 12,
  "drafId": 3
}
```

**Respons 201**

```json
{ "id": 1, "updatedAt": "2026-11-01T22:10:53.110Z" }
```

**Galat**: 422 bila isian tidak valid, jenis/pegawai nonaktif, atau PEGAWAI mengisi penanggung jawab orang lain. 404 bila `drafId` tidak ditemukan.

### `PATCH /api/kegiatan/:id`

Mengubah kegiatan. Body sama dengan `POST /api/kegiatan` (tanpa `drafId`), ditambah:

| Field | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `expectedUpdatedAt` | string | ya | Nilai `updatedAt` saat data dibuka |

**Akses**: PEGAWAI, ADMIN (pemilik kegiatan)

**Respons 200**

```json
{ "id": 1, "updatedAt": "2026-11-01T22:10:53.394Z" }
```

**Galat**

| Status | Kapan |
| --- | --- |
| 403 | Bukan kegiatan milik Anda |
| 404 | Kegiatan tidak ada atau di luar hak baca |
| 409 | `expectedUpdatedAt` sudah tidak sama (data diubah orang lain); muat ulang |
| 422 | Isian tidak valid |

### `POST /api/kegiatan/:id/selesai`

Menyelesaikan kegiatan yang **sedang berlangsung**: waktu selesainya diganti menjadi waktu sekarang, sehingga status pelaksanaannya langsung `selesai`. Status tetap dihitung dari waktu, bukan disimpan terpisah. Status pemeriksaan kembali menjadi "belum diperiksa", seperti saat kegiatan diubah, dan perubahannya tercatat di audit log (`ubah`).

**Akses**: PEGAWAI, ADMIN (pemilik kegiatan)

**Body**: `{ "expectedUpdatedAt": "2026-11-01T22:10:53.394Z" }` (versi data)

**Respons 200**: `{ "id": 1, "updatedAt": "..." }`

**Galat**

| Status | Kapan |
| --- | --- |
| 403, 404 | Bukan kegiatan milik Anda, atau di luar hak baca |
| 409 | `expectedUpdatedAt` sudah tidak sama; muat ulang |
| 422 | Kegiatan belum dimulai, sudah selesai, atau dibatalkan |

### `POST /api/kegiatan/:id/batalkan`

**Akses**: PEGAWAI, ADMIN (pemilik kegiatan)

**Body**

| Field | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `alasan` | string | ya | 1–1.000 karakter |
| `expectedUpdatedAt` | string | ya | Versi data |

```json
{ "alasan": "Narasumber berhalangan", "expectedUpdatedAt": "2026-11-01T22:10:53.394Z" }
```

**Respons 200**: `{ "id": 1, "updatedAt": "..." }`

**Galat**: sama dengan ubah; 422 bila kegiatan sudah dibatalkan.

### `POST /api/kegiatan/:id/pemeriksaan`

Pimpinan/admin menandai kegiatan sudah diperiksa atau perlu perbaikan. Versi data (`updatedAt`) tidak berubah.

**Akses**: PIMPINAN (admin ditolak 403; pemeriksaan isi kegiatan adalah tugas pimpinan)

**Body**

| Field | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `status` | `diperiksa` \| `perlu_perbaikan` | ya | |
| `catatan` | string \| null | wajib bila `perlu_perbaikan` | Maks. 2.000 karakter |

```json
{ "status": "perlu_perbaikan", "catatan": "Lengkapi hasil rapat" }
```

**Respons 200**

```json
{ "id": 1, "statusPemeriksaan": "perlu_perbaikan" }
```

### `DELETE /api/kegiatan/:id`

Menghapus kegiatan (hapus lunak: tidak tampil lagi di daftar dan rekap, tetapi tetap ada di basis data).

**Akses**: PEGAWAI, ADMIN (pemilik kegiatan)

**Respons**: `204 No Content`

---

## Draf kegiatan

Formulir yang belum selesai disimpan sebagai draf milik pribadi (tidak masuk rekap). Maksimal 20 draf per akun.

**Akses semua endpoint draf**: PEGAWAI, ADMIN (hanya draf milik sendiri)

**Isi draf** (`isi`): semua field berupa teks opsional, bentuk mentah dari formulir.

| Field | Maks. karakter |
| --- | --- |
| `judul` | 200 |
| `jenisId` | 10 |
| `uraian` | 5000 |
| `jumlahPeserta` | 6 |
| `tanggalMulai`, `tanggalSelesai` | 10 (`YYYY-MM-DD`) |
| `jamMulai`, `jamSelesai` | 5 (`HH:mm`) |
| `lokasiNama`, `refEksternal` | 255 |
| `lat`, `lng` | 20 |

### `GET /api/draf-kegiatan`

**Respons 200**

```json
[{ "id": 3, "judul": "Draf rapat", "tanggalMulai": "2026-11-05", "updatedAt": "2026-11-01T22:10:53.000Z" }]
```

### `GET /api/draf-kegiatan/:id`

**Respons 200**

```json
{ "id": 3, "isi": { "judul": "Draf rapat", "tanggalMulai": "2026-11-05", "jamMulai": "09:00" }, "updatedAt": "2026-11-01T22:10:53.000Z" }
```

### `POST /api/draf-kegiatan`

**Body**

```json
{ "isi": { "judul": "Draf rapat", "tanggalMulai": "2026-11-05", "jamMulai": "09:00" } }
```

**Respons 201**: draf lengkap (bentuk sama dengan `GET /api/draf-kegiatan/:id`).

**Galat**: 422 bila sudah ada 20 draf.

### `PUT /api/draf-kegiatan/:id`

Mengganti seluruh isi draf. Body sama dengan `POST`.

**Respons 200**: draf lengkap.

### `DELETE /api/draf-kegiatan/:id`

**Respons**: `204 No Content`

---

## Dokumentasi (berkas foto/PDF)

- Jenis yang diterima: JPEG, PNG, WebP, PDF. Jenis dicek dari isi berkas, bukan dari nama.
- Maksimal 20 MB per berkas dan 10 berkas per kegiatan.
- Foto diperkecil otomatis (sisi terpanjang 1920 px) dan data EXIF/GPS dibuang.

### `POST /api/kegiatan/:id/dokumentasi`

**Akses**: PEGAWAI, ADMIN (pemilik kegiatan)

**Header**: `Cookie`, `Content-Type: multipart/form-data`

**Body (form-data)**

| Field | Tipe | Wajib |
| --- | --- | --- |
| `berkas` | file | ya |

```js
const fd = new FormData();
fd.append("berkas", fileInput.files[0]);
await fetch(`/api/kegiatan/${id}/dokumentasi`, { method: "POST", body: fd, credentials: "include" });
```

**Respons 201**

```json
{ "id": 1, "kegiatanId": 1, "namaAsli": "foto.png", "mime": "image/png", "ukuran": 91, "createdAt": "2026-11-01T22:10:53.598Z" }
```

**Galat**: 413 bila lebih dari 20 MB atau sudah 10 berkas, 415 bila jenis tidak didukung atau gambar rusak.

### `PUT /api/dokumentasi/:id`

Mengganti berkas dokumentasi. Body dan respons sama dengan unggah (respons 200).

### `GET /api/dokumentasi/:id`

Menampilkan atau mengunduh berkas.

**Akses**: Login (di luar hak baca dijawab 404)

**Query**

| Field | Nilai | Keterangan |
| --- | --- | --- |
| `unduh` | `1` | Opsional. Memaksa peramban mengunduh, bukan menampilkan |
| `v` | string | Opsional, penanda versi untuk cache (diabaikan server) |

**Respons 200**: isi berkas.

| Header respons | Nilai |
| --- | --- |
| `Content-Type` | Mime berkas, mis. `image/jpeg` |
| `Content-Disposition` | `inline; filename="..."` atau `attachment; filename="..."` bila `unduh=1` |
| `Cache-Control` | `private, max-age=3600` |
| `ETag` | Hash SHA-256 berkas |

### `DELETE /api/dokumentasi/:id`

**Akses**: PEGAWAI, ADMIN (pemilik kegiatan)

**Respons**: `204 No Content`
