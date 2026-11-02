# API Admin: Data Master, Akun, Undangan, Permintaan Akun, Audit Log

Kembali ke [ringkasan](README.md).

Semua endpoint di sini hanya untuk **ADMIN** dan butuh header `Cookie`. Endpoint dengan body memakai `Content-Type: application/json`.

Data master tidak pernah dihapus; nonaktifkan dengan `"aktif": false` agar data lama tetap utuh. Setiap perubahan dicatat di audit log.

---

## Bidang

### `GET /api/admin/unit-kerja`

**Respons 200**

```json
[
  {
    "id": 7,
    "kode": "SEKSI-DATA",
    "nama": "Seksi Pengelolaan Data dan Persediaan",
    "jenisUnitId": 5,
    "jenis": "Seksi",
    "parentId": 3,
    "induk": "Bidang Teknologi Informasi dan Persandian",
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
| `unitKerjaId` | angka | ya | Bidang aktif |
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

**Body**: `nip`, `nama`, `jabatan`, `unitKerjaId` seperti `POST` (tanpa `email`/`role`), ditambah `aktif` (opsional). Bila nama berubah, nama akun tertaut ikut berubah. NIP tidak dipakai untuk login.

**Respons 200**: `{ "id": 1 }`

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

Akun dibuat tanpa kata sandi. Sistem mengirim tautan aktivasi ke email pribadi pemilik akun; pemiliknya membuat kata sandi sendiri. Admin tidak pernah menentukan, melihat, atau mengirim kata sandi. Setiap akun tertaut ke data pegawai (jabatan dan bidang wajib, NIP opsional). Status akun dijelaskan di [api-auth.md](api-auth.md#status-akun).

### `GET /api/admin/akun`

**Query** (opsional)

| Field | Tipe | Keterangan |
| --- | --- | --- |
| `q` | string | Cari nama, email, atau NIP |
| `role` | `PEGAWAI` \| `PIMPINAN` \| `ADMIN` | Ditampilkan sebagai Pegawai, Pimpinan, Admin |
| `status` | `MENUNGGU_AKTIVASI` \| `AKTIF` \| `NONAKTIF` | |
| `page`, `pageSize` | angka | Bawaan 1 dan 20 (maks. 100) |

**Respons 200**

```json
{
  "items": [
    {
      "id": "07747c26-fd62-4ab6-8584-ebf7b244fc3a",
      "name": "Andi Saputra",
      "email": "andi@contoh.com",
      "emailBaru": null,
      "emailVerified": true,
      "role": "PEGAWAI",
      "status": "AKTIF",
      "banned": false,
      "banReason": null,
      "pegawaiId": 1,
      "createdAt": "2026-11-01T22:10:52.682Z",
      "pegawai": {
        "id": 1,
        "nama": "Andi Saputra",
        "nip": "198702152011012002",
        "jabatan": "Analis Data",
        "unitKerjaId": 10,
        "unitKerja": "Seksi Pengelolaan Data dan Persediaan",
        "unitInduk": "Bidang Teknologi Informasi dan Persandian"
      },
      "foto": null,
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
| `emailBaru` | Email baru yang diajukan pemilik akun dan belum diverifikasi |
| `terkunci` | Sedang dikunci 15 menit karena salah kata sandi 5 kali |
| `bisaDihapus` | `false` bila akun pernah dipakai (pernah beraksi, membuat kegiatan, atau mengunggah) |

### `GET /api/admin/akun/:id`

Detail akun: semua field daftar, ditambah `kontak`, `updatedAt`, data pegawai lengkap (`unitKerja: { id, nama, parent }`), `undangan` (`{ "kedaluwarsa": "..." }` untuk akun `MENUNGGU_AKTIVASI`, selain itu `null`), `sesi` (sesi aktif tanpa token), dan `riwayat` (15 catatan audit terbaru terkait akun).

**Galat**: 404 bila tidak ada.

### `POST /api/admin/akun`

Membuat akun beserta data pegawainya dalam satu transaksi, lalu mengirim email aktivasi (berlaku 72 jam).

**Body**

| Field | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `name` | string | ya | Nama lengkap, 1–150 karakter |
| `email` | string | ya | Email pribadi, unik. Menjadi identitas login |
| `nip` | string \| null | tidak | 18 digit. Bila milik pegawai terdaftar yang belum punya akun, data pegawai itu dipakai (tidak diduplikasi) |
| `jabatan` | string | ya | 1–150 karakter |
| `unitKerjaId` | angka | ya | Bidang aktif |
| `role` | `PEGAWAI` \| `PIMPINAN` \| `ADMIN` | ya | |
| `pegawaiId` | angka \| null | tidak | Pakai pegawai tertentu dari Master data |

```json
{ "name": "Andi Saputra", "email": "andi@contoh.com", "nip": null, "jabatan": "Analis Data", "unitKerjaId": 10, "role": "PEGAWAI" }
```

**Respons 201**

```json
{ "id": "07747c26-...", "undangan": { "email": "andi@contoh.com", "galat": null } }
```

Bila email gagal dikirim, akun tetap tersimpan dan `undangan.galat` berisi pesannya; kirim ulang lewat `kirim-ulang-undangan`.

**Galat**: 422 (email/NIP sudah dipakai, pegawai sudah tertaut ke akun lain, jabatan kosong, unit tidak ada/nonaktif).

### `PATCH /api/admin/akun/:id`

Body sama dengan `POST`. Data pegawai tertaut ikut diperbarui (dibuat bila akun lama belum punya).

- Role berubah: semua sesi akun dicabut. Admin tidak bisa mengubah role akunnya sendiri.
- Email berubah pada akun `MENUNGGU_AKTIVASI`: undangan baru dikirim ke email baru, tautan lama tidak berlaku.
- Email berubah pada akun `AKTIF`: email ditandai belum terverifikasi.

**Respons 200**: `{ "id": "...", "undangan": null }` (atau objek undangan seperti `POST`)

### `POST /api/admin/akun/:id/nonaktifkan`

**Body**: `{ "alasan": "Pindah tugas" }` (opsional, maks. 255 karakter)

Akun tidak bisa login, semua sesinya dicabut, dan tautan email yang belum dipakai dibatalkan.

**Respons 200**: `{ "id": "..." }`. **Galat**: 422 bila akun sendiri atau sudah nonaktif.

### `POST /api/admin/akun/:id/aktifkan`

**Respons 200**: `{ "id": "...", "status": "AKTIF" }` (`MENUNGGU_AKTIVASI` bila belum pernah diaktivasi; kirim ulang undangan).

### `POST /api/admin/akun/:id/kirim-ulang-undangan`

Hanya untuk akun `MENUNGGU_AKTIVASI`. Tautan lama tidak berlaku lagi.

**Respons 200**: `{ "id": "...", "email": "andi@contoh.com", "kedaluwarsa": "..." }`

**Galat**: 422 (akun aktif atau nonaktif), 502 (email gagal dikirim).

### `POST /api/admin/akun/:id/reset-sandi`

Reset kata sandi lewat mekanisme resmi: tautan atur ulang (berlaku 1 jam) dikirim ke email pemilik akun, kunci login dibuka, dan semua sesinya dicabut. Kata sandi lama tetap berlaku sampai pemiliknya membuat yang baru. Hanya untuk akun `AKTIF`.

**Body**: tidak ada

**Respons 200**: `{ "id": "...", "email": "andi@contoh.com", "sesiDicabut": 1 }`

**Galat**: 422 (akun menunggu aktivasi atau nonaktif), 502 (email gagal dikirim).

### `POST /api/admin/akun/:id/cabut-sesi`

Mengeluarkan akun dari semua perangkat. Bila admin mencabut sesinya sendiri, sesi yang sedang dipakai tetap berlaku.

**Respons 200**: `{ "id": "...", "jumlah": 2 }`

### `DELETE /api/admin/akun/:id`

Menghapus akun yang belum pernah dipakai. Data pegawainya tetap ada.

**Respons 200**: `{ "id": "..." }`

**Galat**: 422 bila akun pernah dipakai (nonaktifkan saja) atau menghapus akun sendiri.

---

## Undangan akun

### `POST /api/admin/pegawai/:id/undang`

Membuat akun untuk pegawai di Master data lalu mengirim email aktivasi. Bisa dipanggil ulang untuk akun yang belum diaktivasi (tautan lama tidak berlaku lagi).

**Body**

| Field | Tipe | Wajib |
| --- | --- | --- |
| `email` | string | ya |
| `role` | `PEGAWAI` \| `PIMPINAN` \| `ADMIN` | ya |

**Respons 200**

```json
{ "userId": "07747c26-...", "email": "andi@contoh.com", "kirimUlang": false }
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

Menyetujui permintaan setelah identitas pemohon diverifikasi: akun dibuat dan email aktivasi dikirim. Bila pemohon tidak punya data pegawai, data pegawai baru dibuat dari `unitKerjaId` dan `jabatan` (keduanya wajib dalam kasus ini).

**Body**

| Field | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `role` | `PEGAWAI` \| `PIMPINAN` \| `ADMIN` | ya | |
| `email` | string | tidak | Ganti email pemohon bila perlu |
| `unitKerjaId` | angka | bila tanpa data pegawai | Bidang pegawai baru |
| `jabatan` | string | bila tanpa data pegawai | Jabatan pegawai baru |

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
  "aksi": ["login", "login_gagal", "akun_terkunci", "logout", "buat", "ubah", "hapus", "batal", "unggah", "hapus_file", "ganti_file", "periksa", "ekspor", "aktifkan", "nonaktifkan", "reset_sandi", "undang", "aktivasi", "minta_akun", "setujui", "tolak", "minta_reset_sandi", "kirim_reset_sandi", "ganti_sandi", "minta_ganti_email", "ganti_email", "batal_ganti_email", "cabut_sesi"]
}
```
