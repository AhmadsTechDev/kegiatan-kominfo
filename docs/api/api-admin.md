# API Admin: Data Master, Akun, Undangan, Permintaan Akun, Audit Log

Kembali ke [ringkasan](README.md).

Semua endpoint di sini hanya untuk **ADMIN** dan butuh header `Cookie`. Endpoint dengan body memakai `Content-Type: application/json`.

Data master tidak pernah dihapus; nonaktifkan dengan `"aktif": false` agar data lama tetap utuh. Setiap perubahan dicatat di audit log.

---

## Bidang

### `GET /api/admin/bidang`

**Respons 200**

```json
[
  {
    "id": 7,
    "kode": "SUBBID-DATA",
    "nama": "Sub Bidang Pengelolaan Data",
    "jenis": "Sub bidang",
    "parentId": 3,
    "induk": "Bidang Teknologi Informasi dan Persandian",
    "aktif": true,
    "updatedAt": "2026-11-01T22:10:39.076Z",
    "jumlahPegawaiAktif": 0,
    "bisaDihapus": true
  }
]
```

### `POST /api/admin/bidang`

**Body**

| Field | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `nama` | string | ya | 1–150 karakter |
| `parentId` | angka \| null | ya | Bidang induk. `null` untuk bidang (tingkat tertinggi); diisi untuk sub bidang, dan induknya harus sebuah bidang (maksimal dua tingkat) |
| `kode` | string | tidak | Huruf, angka, `-`, maks. 30. Bila kosong dibuat otomatis, mis. "Bidang Statistik Sektoral" menjadi `BID-SS` |

```json
{ "nama": "Bidang Statistik Sektoral", "parentId": null }
```

**Respons 201**: `{ "id": 12 }`

**Galat**: 422 bila induk bukan sebuah bidang, bidang induk nonaktif, atau kode sudah dipakai.

### `PATCH /api/admin/bidang/:id`

Body sama dengan `POST`, ditambah `aktif` (boolean, opsional). Kode yang dikosongkan tidak berubah.

**Respons 200**: `{ "id": 12 }`

**Galat**: 422 bila menonaktifkan bidang yang masih punya sub bidang atau pegawai aktif, atau menjadikan bidang yang masih punya sub bidang sebagai sub bidang.

Tingkat (`jenis` pada respons) tidak disimpan: dihitung dari `parentId`, yaitu `Bidang` bila kosong dan `Sub bidang` bila terisi. Kode otomatis memakai awalan `BID` atau `SUBBID`.

### `DELETE /api/admin/bidang/:id`

Menghapus bidang atau sub bidang secara permanen. Hanya boleh bila belum dipakai: tidak punya pegawai (aktif maupun tidak), kegiatan (termasuk yang sudah dihapus lunak), atau sub bidang. Yang sudah dipakai cukup dinonaktifkan lewat `PATCH`. Field `bisaDihapus` pada daftar menunjukkan apakah hapus diperbolehkan. Tercatat di audit log (`hapus`).

**Respons 200**: `{ "id": 12 }`

**Galat**: 404 bila tidak ada; 422 bila masih dipakai, mis. "Tidak dapat dihapus karena masih punya 3 pegawai, 2 kegiatan. Nonaktifkan saja agar riwayatnya tetap utuh".

---

## Pegawai

### `GET /api/admin/pegawai`

**Query** (opsional)

| Field | Tipe | Keterangan |
| --- | --- | --- |
| `q` | string | Cari nama, NIP, atau jabatan |
| `unit` | angka | Id unit; sub-unit ikut tercakup |
| `aktif` | `1` \| `0` | |
| `akun` | `tanpa` \| `ada` | `tanpa`: belum punya akun (tab Perlu diundang); `ada`: sudah punya akun (Master data > Pegawai) |
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
      "bidang": { "id": 10, "nama": "Seksi Pengelolaan Data dan Persediaan" },
      "aktif": true,
      "roleUndangan": "PEGAWAI",
      "updatedAt": "2026-11-01T22:10:53.770Z",
      "akun": { "id": "07747c26-fd62-4ab6-8584-ebf7b244fc3a", "email": "andi@diskominfo.local", "aktif": true }
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 20
}
```

`akun` bernilai `null` bila pegawai belum punya akun. `akun.aktif: false` berarti undangan sudah dikirim tetapi belum diaktivasi. `roleUndangan` (`PEGAWAI`, `PIMPINAN`, atau `ADMIN`) adalah role bawaan saat pegawai diundang; role sebenarnya ada di akun.

### `POST /api/admin/pegawai`

Menambah pegawai, sekaligus mengirim undangan akun bila `email` diisi.

**Body**

| Field | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `nama` | string | ya | 1–150 karakter |
| `bidangId` | angka | ya | Bidang aktif |
| `nip` | string \| null | tidak | 18 digit, sah, dan belum terdaftar. Kosongkan untuk non-ASN |
| `jabatan` | string \| null | tidak | Maks. 150 karakter |
| `email` | string \| null | tidak | Bila diisi, langsung dikirimi undangan akun |
| `role` | `PEGAWAI` \| `PIMPINAN` | tidak | Role akun undangan, bawaan `PEGAWAI` |

```json
{ "nip": "198702152011012002", "nama": "Andi Saputra", "jabatan": "Analis", "bidangId": 10, "email": "andi@diskominfo.local" }
```

**Respons 201**

```json
{ "id": 1, "undangan": { "email": "andi@diskominfo.local", "galat": null } }
```

- `undangan` bernilai `null` bila `email` tidak diisi.
- Bila pegawai tersimpan tetapi email gagal dikirim, `undangan.galat` berisi pesannya. Undangan bisa dikirim ulang lewat `POST /api/admin/pegawai/:id/undang`.

### `PATCH /api/admin/pegawai/:id`

**Body**: `nip`, `nama`, `jabatan`, `bidangId` seperti `POST` (tanpa `email`/`role`), ditambah `aktif` (opsional), `roleUndangan` (opsional, `PEGAWAI`, `PIMPINAN`, atau `ADMIN`, bawaan untuk dialog Undang), dan `kontak` (opsional, nomor telepon; disimpan di akun sehingga hanya bisa diisi bila pegawai sudah punya akun, selain itu 422). Bila nama berubah, nama akun tertaut ikut berubah. NIP tidak dipakai untuk login.

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
        "bidangId": 10,
        "bidang": "Seksi Pengelolaan Data dan Persediaan",
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

Detail akun: semua field daftar, ditambah `kontak`, `updatedAt`, data pegawai lengkap (`bidang: { id, nama, parent }`), `undangan` (`{ "kedaluwarsa": "..." }` untuk akun `MENUNGGU_AKTIVASI`, selain itu `null`), `sesi` (sesi aktif tanpa token), dan `riwayat` (15 catatan audit terbaru terkait akun).

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
| `bidangId` | angka | ya | Bidang aktif |
| `role` | `PEGAWAI` \| `PIMPINAN` \| `ADMIN` | ya | |
| `pegawaiId` | angka \| null | tidak | Pakai pegawai tertentu dari Master data |

```json
{ "name": "Andi Saputra", "email": "andi@contoh.com", "nip": null, "jabatan": "Analis Data", "bidangId": 10, "role": "PEGAWAI" }
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
      "bidang": null
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 20,
  "jumlahMenunggu": 0
}
```

`pegawai` (`{ id, nip, nama, jabatan }`) dan `bidang` terisi bila pemohon mengisi NIP yang terdaftar.

### `GET /api/admin/permintaan-akun/jumlah`

Untuk badge di menu admin.

**Respons 200**: `{ "menunggu": 3 }`

### `POST /api/admin/permintaan-akun/:id/setujui`

Menyetujui permintaan setelah identitas pemohon diverifikasi: akun dibuat dan email aktivasi dikirim. Bila pemohon tidak punya data pegawai, data pegawai baru dibuat dari `bidangId` dan `jabatan` (keduanya wajib dalam kasus ini).

**Body**

| Field | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `role` | `PEGAWAI` \| `PIMPINAN` \| `ADMIN` | ya | |
| `email` | string | tidak | Ganti email pemohon bila perlu |
| `bidangId` | angka | bila tanpa data pegawai | Bidang pegawai baru |
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
  "entitas": ["dokumentasi", "kegiatan", "pegawai", "permintaan_akun", "bidang", "user"],
  "aksi": ["login", "login_gagal", "akun_terkunci", "logout", "buat", "ubah", "hapus", "batal", "unggah", "hapus_file", "ganti_file", "periksa", "ekspor", "aktifkan", "nonaktifkan", "reset_sandi", "undang", "aktivasi", "minta_akun", "setujui", "tolak", "minta_reset_sandi", "kirim_reset_sandi", "ganti_sandi", "minta_ganti_email", "ganti_email", "batal_ganti_email", "cabut_sesi"]
}
```
