# API Admin: Data Master, Akun, Undangan, Permintaan Akun, Audit Log

Kembali ke [ringkasan](README.md).

Semua endpoint di sini hanya untuk **ADMIN** dan butuh header `Cookie`. Endpoint dengan body memakai `Content-Type: application/json`, kecuali impor Excel (`multipart/form-data`).

Data master tidak pernah dihapus; nonaktifkan dengan `"aktif": false` agar data lama tetap utuh. Setiap perubahan dicatat di audit log.

---

## Unit kerja

### `GET /api/admin/unit-kerja`

**Respons 200**

```json
[
  {
    "id": 7,
    "kode": "SUBAG-UMPEG",
    "nama": "Sub Bagian Umum dan Kepegawaian",
    "jenisUnitId": 4,
    "jenis": "Sub bagian",
    "parentId": 1,
    "induk": "Sekretariat",
    "aktif": true,
    "updatedAt": "2026-11-01T22:10:39.076Z",
    "jumlahPegawaiAktif": 0
  }
]
```

### `POST /api/admin/unit-kerja`

**Body**

| Field | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `nama` | string | ya | 1–150 karakter |
| `jenisUnitId` | angka | ya | Id jenis unit aktif |
| `parentId` | angka \| null | ya | Unit induk. Wajib diisi bila jenisnya punya jenis induk (mis. Seksi harus di bawah Bidang); `null` untuk unit tertinggi |
| `kode` | string | tidak | Huruf, angka, `-`, maks. 30. Bila kosong dibuat otomatis, mis. "Bidang Statistik Sektoral" menjadi `BID-SS` |

```json
{ "nama": "Bidang Statistik Sektoral", "jenisUnitId": 2, "parentId": null }
```

**Respons 201**: `{ "id": 12 }`

**Galat**: 422 bila induk tidak sesuai jenis, unit induk nonaktif, atau kode sudah dipakai.

### `PATCH /api/admin/unit-kerja/:id`

Body sama dengan `POST`, ditambah `aktif` (boolean, opsional). Kode yang dikosongkan tidak berubah.

**Respons 200**: `{ "id": 12 }`

**Galat**: 422 bila menonaktifkan unit yang masih punya sub-unit atau pegawai aktif, atau mengganti jenis unit yang masih punya sub-unit aktif.

---

## Jenis unit

### `GET /api/admin/jenis-unit`

**Respons 200**

```json
[{ "id": 5, "nama": "Seksi", "indukJenisId": 2, "aktif": true, "updatedAt": "2026-11-01T22:10:38.968Z", "jumlahUnit": 2, "jumlahUnitAktif": 2 }]
```

### `POST /api/admin/jenis-unit`

**Body**

| Field | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `nama` | string | ya | 1–100 karakter, unik |
| `indukJenisId` | angka \| null | ya | Jenis unit di atasnya; `null` untuk jenis tertinggi |

**Respons 201**: `{ "id": 6 }`

### `PATCH /api/admin/jenis-unit/:id`

Body sama dengan `POST`, ditambah `aktif` (opsional).

**Respons 200**: `{ "id": 6 }`

**Galat**: 422 bila induk membentuk lingkaran, atau mengubah posisi/menonaktifkan jenis yang masih dipakai unit aktif.

---

## Pegawai

### `GET /api/admin/pegawai`

**Query** (opsional)

| Field | Tipe | Keterangan |
| --- | --- | --- |
| `q` | string | Cari nama, NIP, atau jabatan |
| `unit` | angka | Id unit; sub-unit ikut tercakup |
| `aktif` | `1` \| `0` | |
| `page`, `pageSize` | angka | Bawaan 1 dan 20 (maks. 100) |

**Respons 200**

```json
{
  "items": [
    {
      "id": 1,
      "nip": "198702152011012002",
      "nama": "Andi Saputra",
      "jabatan": "Analis Data",
      "unitKerja": { "id": 10, "nama": "Seksi Pengelolaan Data dan Persediaan" },
      "aktif": true,
      "updatedAt": "2026-11-01T22:10:53.770Z",
      "akun": { "id": "07747c26-fd62-4ab6-8584-ebf7b244fc3a", "email": "andi@diskominfo.local", "aktif": true }
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 20
}
```

`akun` bernilai `null` bila pegawai belum punya akun. `akun.aktif: false` berarti undangan sudah dikirim tetapi belum diaktivasi.

### `POST /api/admin/pegawai`

Menambah pegawai, sekaligus mengirim undangan akun bila `email` diisi.

**Body**

| Field | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `nama` | string | ya | 1–150 karakter |
| `unitKerjaId` | angka | ya | Unit kerja aktif |
| `nip` | string \| null | tidak | 18 digit, sah, dan belum terdaftar. Kosongkan untuk non-ASN |
| `jabatan` | string \| null | tidak | Maks. 150 karakter |
| `email` | string \| null | tidak | Bila diisi, langsung dikirimi undangan akun |
| `role` | `PEGAWAI` \| `PIMPINAN` | tidak | Role akun undangan, bawaan `PEGAWAI` |

```json
{ "nip": "198702152011012002", "nama": "Andi Saputra", "jabatan": "Analis", "unitKerjaId": 10, "email": "andi@diskominfo.local" }
```

**Respons 201**

```json
{ "id": 1, "undangan": { "email": "andi@diskominfo.local", "galat": null } }
```

- `undangan` bernilai `null` bila `email` tidak diisi.
- Bila pegawai tersimpan tetapi email gagal dikirim, `undangan.galat` berisi pesannya. Undangan bisa dikirim ulang lewat `POST /api/admin/pegawai/:id/undang`.

### `PATCH /api/admin/pegawai/:id`

**Body**: `nip`, `nama`, `jabatan`, `unitKerjaId` seperti `POST` (tanpa `email`/`role`), ditambah `aktif` (opsional). Bila NIP berubah, username login akunnya ikut berubah.

**Respons 200**: `{ "id": 1 }`

### `GET /api/admin/pegawai/impor/templat`

Mengunduh templat Excel impor pegawai (berisi petunjuk dan daftar unit kerja).

**Respons 200**: berkas `.xlsx` (`Content-Disposition: attachment; filename="templat-impor-pegawai.xlsx"`).

### `POST /api/admin/pegawai/impor`

Impor pegawai dari Excel. Kirim dulu tanpa `simpan` untuk pratinjau, lalu kirim ulang dengan `simpan=1`.

**Header**: `Content-Type: multipart/form-data`

**Body (form-data)**

| Field | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `berkas` | file | ya | `.xlsx`, maks. 2 MB dan 1.000 baris. Kolom wajib: Nama dan Unit kerja; NIP dan Jabatan opsional |
| `simpan` | `1` | tidak | `1` = simpan; selain itu hanya pratinjau |

**Respons 200**

```json
{
  "ringkasan": { "total": 3, "baru": 1, "perbarui": 1, "sama": 0, "galat": 1 },
  "baris": [
    {
      "baris": 6,
      "nip": "198702152011012002",
      "nama": "Andi Saputra",
      "jabatan": "Analis",
      "unit": { "id": 10, "nama": "Seksi Pengelolaan Data dan Persediaan" },
      "unitTeks": "Seksi Pengelolaan Data dan Persediaan",
      "status": "perbarui",
      "pesan": ["NIP sudah terdaftar; nama, jabatan, atau unit akan diperbarui"],
      "pegawaiId": 1
    }
  ],
  "disimpan": false
}
```

| `status` | Arti |
| --- | --- |
| `baru` | Akan ditambahkan |
| `perbarui` | Pegawai sudah ada (dicocokkan lewat NIP, atau lewat nama bila tanpa NIP) dan datanya berubah |
| `sama` | Sudah ada dan tidak berubah; dilewati |
| `galat` | Tidak disimpan; alasannya ada di `pesan` |

`baris` adalah nomor baris di Excel. Saat `simpan=1`, hanya baris `baru` dan `perbarui` yang disimpan (dalam satu transaksi).

**Galat**: 415 bila bukan `.xlsx`, 422 bila kolom wajib tidak ditemukan, lebih dari 1.000 baris, atau tidak ada yang bisa disimpan.

---

## Jenis kegiatan

### `GET /api/admin/jenis-kegiatan`

**Respons 200**

```json
[{ "id": 1, "nama": "Rapat", "aktif": true, "updatedAt": "2026-11-01T22:10:39.139Z", "jumlahKegiatan": 2 }]
```

### `POST /api/admin/jenis-kegiatan`

**Body**: `{ "nama": "Rapat" }` (1–100 karakter, unik)

**Respons 201**: `{ "id": 6 }`

### `PATCH /api/admin/jenis-kegiatan/:id`

**Body**: `{ "nama": "Rapat", "aktif": false }` (`aktif` opsional)

**Respons 200**: `{ "id": 6 }`

---

## Manajemen akun

### `GET /api/admin/akun`

**Query** (opsional)

| Field | Tipe | Keterangan |
| --- | --- | --- |
| `q` | string | Cari nama, email, atau NIP |
| `role` | `PEGAWAI` \| `PIMPINAN` \| `ADMIN` | |
| `aktif` | `1` \| `0` | `0` = akun yang dinonaktifkan |
| `page`, `pageSize` | angka | Bawaan 1 dan 20 |

**Respons 200**

```json
{
  "items": [
    {
      "id": "07747c26-fd62-4ab6-8584-ebf7b244fc3a",
      "name": "Andi Saputra",
      "email": "andi@diskominfo.local",
      "username": "198702152011012002",
      "role": "PEGAWAI",
      "banned": false,
      "banReason": null,
      "pegawaiId": 1,
      "createdAt": "2026-11-01T22:10:52.682Z",
      "pegawai": {
        "id": 1,
        "nama": "Andi Saputra",
        "nip": "198702152011012002",
        "jabatan": "Analis Data",
        "unitKerja": "Seksi Pengelolaan Data dan Persediaan",
        "unitInduk": "Bidang Teknologi Informasi dan Persandian"
      },
      "foto": "/api/me/foto/07747c26-...?v=e2e12a91-...",
      "menungguAktivasi": false,
      "terkunci": false,
      "bisaDihapus": false
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 20
}
```

| Field | Keterangan |
| --- | --- |
| `banned` | `true` = akun dinonaktifkan |
| `menungguAktivasi` | Undangan belum diaktivasi (belum punya kata sandi) |
| `terkunci` | Sedang dikunci 15 menit karena salah kata sandi 5 kali |
| `bisaDihapus` | `false` bila akun pernah dipakai (pernah beraksi, membuat kegiatan, atau mengunggah) |

### `POST /api/admin/akun`

Membuat akun langsung dengan kata sandi (tanpa email undangan).

**Body**

| Field | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `name` | string | ya | 1–150 karakter |
| `email` | string | ya | Unik |
| `role` | `PEGAWAI` \| `PIMPINAN` \| `ADMIN` | ya | |
| `password` | string | ya | 10–128 karakter |
| `pegawaiId` | angka \| null | tidak | Tautkan ke pegawai; NIP pegawai menjadi username login |
| `nip` | string \| null | tidak | Dipakai bila tanpa `pegawaiId`; tidak boleh NIP milik pegawai terdaftar |

**Respons 201**: `{ "id": "07747c26-..." }`

**Galat**: 422 bila email/NIP sudah dipakai atau pegawai sudah tertaut ke akun lain.

### `PATCH /api/admin/akun/:id`

Body sama dengan `POST` tanpa `password`. Bila role berubah, akun itu otomatis logout dari semua perangkat. Admin tidak bisa mengubah role akunnya sendiri.

**Respons 200**: `{ "id": "..." }`

### `POST /api/admin/akun/:id/hubungkan-pegawai`

Menautkan akun ke pegawai yang ada, atau membuat pegawai baru dari nama akun.

**Body** (isi salah satu)

```json
{ "pegawaiId": 1 }
```

```json
{ "pegawaiBaru": { "unitKerjaId": 10, "nip": null, "jabatan": "Staf" } }
```

**Respons 200**: `{ "id": "..." }`

### `POST /api/admin/akun/:id/nonaktifkan`

**Body**: `{ "alasan": "Pindah tugas" }` (opsional, maks. 255 karakter)

**Respons 200**: `{ "id": "..." }`

**Galat**: 422 bila menonaktifkan akun sendiri atau akun sudah nonaktif.

### `POST /api/admin/akun/:id/aktifkan`

**Body**: tidak ada

**Respons 200**: `{ "id": "..." }`

### `POST /api/admin/akun/:id/reset-sandi`

Mengatur kata sandi baru. Kunci login dibuka dan akun itu logout dari semua perangkat.

**Body**: `{ "password": "sandibaru12345" }` (10–128 karakter)

**Respons 200**: `{ "id": "..." }`

### `DELETE /api/admin/akun/:id`

Menghapus akun yang belum pernah dipakai.

**Respons 200**: `{ "id": "..." }`

**Galat**: 422 bila akun pernah dipakai (nonaktifkan saja) atau menghapus akun sendiri.

---

## Undangan akun

### `POST /api/admin/pegawai/:id/undang`

Membuat akun untuk pegawai lalu mengirim email aktivasi. Bisa dipanggil ulang untuk mengirim ulang undangan yang belum diaktivasi (tautan lama tidak berlaku lagi).

**Body**

| Field | Tipe | Wajib |
| --- | --- | --- |
| `email` | string | ya |
| `role` | `PEGAWAI` \| `PIMPINAN` \| `ADMIN` | ya |

**Respons 200**

```json
{ "userId": "07747c26-...", "email": "andi@diskominfo.local", "kirimUlang": false }
```

**Galat**

| Status | Kapan |
| --- | --- |
| 404 | Pegawai tidak ada atau nonaktif |
| 422 | Pegawai sudah punya akun aktif, akunnya sedang nonaktif, atau email dipakai akun lain |
| 502 | Email gagal dikirim (periksa pengaturan SMTP/Brevo) |

---

## Permintaan akun

Permintaan yang diajukan dari halaman login (lihat [api-auth.md](api-auth.md#mengajukan-permintaan-akun)).

### `GET /api/admin/permintaan-akun`

**Query** (opsional): `status` (`MENUNGGU` \| `DISETUJUI` \| `DITOLAK`), `page`, `pageSize`

**Respons 200**

```json
{
  "items": [
    {
      "id": 1,
      "nama": "Budi",
      "email": "budi@diskominfo.local",
      "catatan": "Staf baru",
      "status": "DITOLAK",
      "alasanTolak": "Bukan pegawai",
      "diprosesAt": "2026-11-01T22:10:54.569Z",
      "diprosesOleh": "Administrator",
      "createdAt": "2026-11-01T22:10:54.447Z",
      "pegawai": null,
      "unitKerja": null
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 20,
  "jumlahMenunggu": 0
}
```

`pegawai` (`{ id, nip, nama, jabatan }`) dan `unitKerja` terisi bila pemohon mengisi NIP yang terdaftar.

### `GET /api/admin/permintaan-akun/jumlah`

Untuk badge di menu admin.

**Respons 200**: `{ "menunggu": 3 }`

### `POST /api/admin/permintaan-akun/:id/setujui`

Menyetujui permintaan: akun dibuat dan email aktivasi dikirim. Bila pemohon tanpa NIP dan `unitKerjaId` diisi, data pegawai baru dibuat dulu.

**Body**

| Field | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `role` | `PEGAWAI` \| `PIMPINAN` \| `ADMIN` | ya | |
| `email` | string | tidak | Ganti email pemohon bila perlu |
| `unitKerjaId` | angka | tidak | Untuk membuat data pegawai baru |
| `jabatan` | string \| null | tidak | Jabatan pegawai baru |

**Respons 200**: sama dengan undangan, `{ "userId": "...", "email": "...", "kirimUlang": false }`

**Galat**: 404 bila tidak ada, 409 bila sudah diproses admin lain, 422/502 seperti undangan. Bila gagal, status permintaan kembali `MENUNGGU`.

### `POST /api/admin/permintaan-akun/:id/tolak`

Pemohon diberi tahu lewat email.

**Body**: `{ "alasan": "Bukan pegawai Diskominfo" }` (1–500 karakter)

**Respons 200**: `{ "id": 1 }`

**Galat**: 404 bila tidak ada, 409 bila sudah diproses.

---

## Audit log

Catatan aktivitas yang tidak bisa diubah atau dihapus. Data rahasia (kata sandi, token, cookie) tidak pernah disimpan.

### `GET /api/audit-log`

**Query** (opsional)

| Field | Tipe | Keterangan |
| --- | --- | --- |
| `aktor` | string | Id user |
| `aksi` | string | Salah satu nilai di `GET /api/audit-log/pilihan` → `aksi` |
| `entitas` | string | Mis. `kegiatan`, `user`, `pegawai` |
| `dari`, `sampai` | `YYYY-MM-DD` | Rentang tanggal (WIB) |
| `page`, `pageSize` | angka | Bawaan 1 dan 25 (maks. 100) |

**Respons 200**

```json
{
  "items": [
    {
      "id": 20,
      "waktu": "2026-11-01T22:11:41.606Z",
      "aksi": "login",
      "entitas": "user",
      "entitasId": "1ef5cd20-31a9-4698-a05d-ab22baaf7821",
      "ip": "10.0.0.5",
      "aktor": { "id": "1ef5cd20-...", "nama": "Administrator", "email": "admin@diskominfo.local" }
    }
  ],
  "total": 20,
  "page": 1,
  "pageSize": 25
}
```

`aktor` bernilai `null` untuk aksi tanpa pelaku (mis. login gagal dengan email tak dikenal). Bila akunnya sudah dihapus, `aktor.nama` berisi `"Akun dihapus"`.

### `GET /api/audit-log/:id`

**Respons 200**: sama dengan item daftar, ditambah:

| Field | Keterangan |
| --- | --- |
| `dataSebelum` | Isi data sebelum diubah (JSON) atau `null` |
| `dataSesudah` | Isi data sesudah diubah (JSON) atau `null` |
| `userAgent` | Peramban/perangkat pelaku |

### `GET /api/audit-log/pilihan`

Isi pilihan filter.

**Respons 200**

```json
{
  "aktor": [{ "id": "1ef5cd20-...", "nama": "Administrator", "email": "admin@diskominfo.local" }],
  "entitas": ["dokumentasi", "kegiatan", "pegawai", "permintaan_akun", "unit_kerja", "user"],
  "aksi": ["login", "login_gagal", "akun_terkunci", "logout", "buat", "ubah", "hapus", "batal", "unggah", "hapus_file", "ganti_file", "periksa", "ekspor", "aktifkan", "nonaktifkan", "reset_sandi", "undang", "aktivasi", "minta_akun", "setujui", "tolak"]
}
```
