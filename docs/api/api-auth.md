# API Autentikasi dan Akun Sendiri

Kembali ke [ringkasan](README.md).

- **Login hanya dengan email pribadi.** NIP adalah atribut kepegawaian, bukan identitas login.
- **Tidak ada pendaftaran mandiri.** Akun dibuat admin (lihat [api-admin.md](api-admin.md#manajemen-akun)). Pemiliknya membuat kata sandi sendiri lewat tautan aktivasi di email.
- Login, logout, dan sesi ditangani **Better Auth** di `/api/auth/*`. Hanya tiga endpoint Better Auth yang terbuka: `sign-in/email`, `sign-out`, dan `get-session`. Endpoint Better Auth lain (mis. `sign-up/email`, `request-password-reset`, `update-user`, `change-password`, `admin/*`) dijawab **404**.
- Permintaan yang mengubah data (`POST`, `PATCH`, `PUT`, `DELETE`) wajib membawa header `Origin` (atau `Referer`) dari frontend. Selain itu dijawab **403 `ASAL_DITOLAK`** (perlindungan CSRF).
- Format galat seragam: `{ "code": "...", "message": "...", "details": [{ "field": "...", "message": "..." }] }`.

## Status akun

| Status | Arti | Bisa login |
| --- | --- | --- |
| `MENUNGGU_AKTIVASI` | Dibuat admin, pemiliknya belum membuat kata sandi | Tidak |
| `AKTIF` | Sudah membuat kata sandi dan tidak dinonaktifkan | Ya |
| `NONAKTIF` | Dinonaktifkan admin | Tidak (sesi dicabut) |

Status diturunkan dari data (ada-tidaknya kredensial dan kolom `banned`), tidak disimpan terpisah.

## Kebijakan kata sandi

8–128 karakter, berisi huruf dan angka, bukan satu karakter berulang, dan tidak memuat bagian depan email. Disimpan sebagai hash **Argon2id**. Galat kebijakan dijawab 422 dengan `details[].field` menunjuk input yang salah.

## Tautan email

| Tujuan | Halaman frontend | Berlaku | Sekali pakai |
| --- | --- | --- | --- |
| Aktivasi akun | `/aktivasi?token=` | 72 jam | Ya |
| Atur ulang kata sandi | `/reset-sandi?token=` | 1 jam | Ya |
| Verifikasi email baru | `/konfirmasi-email?token=` | 24 jam | Ya |

Token 256-bit acak; basis data hanya menyimpan hash SHA-256-nya. Menerbitkan token baru dengan tujuan yang sama membatalkan token lama. Token yang salah, kedaluwarsa, atau sudah dipakai dijawab **410 `TOKEN_TIDAK_BERLAKU`**.

---

## Login

### `POST /api/auth/sign-in/email`

**Akses**: Publik (maks. 30 percobaan per menit per IP)

**Body**

| Field | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `email` | string | ya | Email pribadi akun |
| `password` | string | ya | |

```json
{ "email": "andi@contoh.com", "password": "sandirahasia123" }
```

**Respons 200**: cookie sesi dipasang lewat `Set-Cookie` (`HttpOnly`, `SameSite=Lax`, `Secure` di produksi, berlaku 8 jam).

```json
{
  "redirect": false,
  "token": "kzns7P46mcygAAKFYevhVVZ5yQaThkkG",
  "user": { "id": "1ef5cd20-...", "name": "Andi Saputra", "email": "andi@contoh.com", "emailVerified": true, "role": "PEGAWAI", "pegawaiId": 1 }
}
```

**Galat**

| Status | `code` | Kapan |
| --- | --- | --- |
| 401 | `INVALID_EMAIL_OR_PASSWORD` | Email tidak terdaftar, kata sandi salah, atau akun belum diaktivasi (pesan sengaja sama) |
| 403 | `BANNED_USER` | Akun dinonaktifkan (hanya bila kata sandi benar) |
| 429 | `ACCOUNT_LOCKED` | Salah 5 kali; terkunci 15 menit. Ada field `lockedUntil` |
| 429 | | Lebih dari 30 percobaan per menit dari IP yang sama |

Hash kata sandi lama (scrypt) tetap diterima dan otomatis diganti ke Argon2id saat login berhasil.

### `POST /api/auth/sign-out`

**Akses**: Login. **Body**: `{}`. **Respons 200**: `{ "success": true }`, cookie dihapus, sesi dicabut.

### `GET /api/auth/get-session`

**Akses**: Publik (mengembalikan `null` bila belum login). **Respons 200**: `{ "session": {...}, "user": {...} }`.

---

## Aktivasi akun

### `GET /api/aktivasi?token=<token>`

Cek token sebelum pengguna membuat kata sandi. **Akses**: Publik (maks. 20 permintaan tautan per 15 menit per IP).

**Respons 200**

```json
{ "nama": "Andi Saputra", "email": "andi@contoh.com", "kedaluwarsa": "2026-11-05T08:00:00.000Z" }
```

**Galat**: 410 `TOKEN_TIDAK_BERLAKU` (juga bila akun sudah aktif atau dinonaktifkan).

### `POST /api/aktivasi`

Membuat kata sandi pertama. Email ditandai terverifikasi dan status menjadi `AKTIF`.

**Body**: `{ "token": "...", "password": "sandibaru12345" }`

**Respons 200**: `{ "email": "andi@contoh.com" }`

**Galat**: 410 `TOKEN_TIDAK_BERLAKU`, 422 bila kata sandi tidak memenuhi kebijakan (`details[0].field = "password"`).

---

## Lupa dan atur ulang kata sandi

### `POST /api/lupa-sandi`

**Akses**: Publik (maks. 5 per 15 menit per IP; per email maks. 3 tautan per jam, kelebihannya diabaikan tanpa galat)

**Body**: `{ "email": "andi@contoh.com" }`

**Respons 200** (selalu sama, terdaftar atau tidak, agar tidak bisa dipakai menebak email)

```json
{ "message": "Bila email tersebut terdaftar dan aktif, tautan untuk mengatur ulang kata sandi telah dikirim. Periksa kotak masuk atau folder spam." }
```

Tautan hanya dikirim ke akun `AKTIF`. Akun yang belum diaktivasi perlu undangan ulang dari admin.

### `GET /api/reset-sandi?token=<token>`

**Respons 200**: `{ "email": "andi@contoh.com", "kedaluwarsa": "..." }`. **Galat**: 410.

### `POST /api/reset-sandi`

**Body**: `{ "token": "...", "password": "sandibaru12345" }`

**Respons 200**: `{ "email": "andi@contoh.com" }`. Semua sesi akun dicabut, kunci login dibuka, dan pemilik akun menerima email pemberitahuan.

**Galat**: 410, 422 (kebijakan kata sandi).

---

## Verifikasi email baru

### `POST /api/konfirmasi-email`

Dibuka dari tautan di email baru. Tidak perlu login.

**Body**: `{ "token": "..." }`

**Respons 200**: `{ "email": "baru@contoh.com" }`. Email login berganti; email lama menerima pemberitahuan.

**Galat**: 410, 422 bila email baru sudah keburu dipakai akun lain.

---

## Akun sendiri (`/api/me`)

Semua endpoint di bawah butuh login (semua role).

### `GET /api/me`

**Respons 200**

```json
{
  "id": "07747c26-...",
  "name": "Andi Saputra",
  "email": "andi@contoh.com",
  "emailBaru": null,
  "emailVerified": true,
  "role": "PEGAWAI",
  "status": "AKTIF",
  "kontak": "0812-000",
  "createdAt": "2026-11-01T22:10:52.682Z",
  "pegawai": {
    "id": 1,
    "nip": "198702152011012002",
    "nama": "Andi Saputra",
    "jabatan": "Analis Data",
    "bidang": { "id": 10, "kode": "SEKSI-DATA", "nama": "Seksi Pengelolaan Data dan Persediaan", "parent": { "id": 4, "nama": "Bidang Teknologi Informasi dan Persandian" } }
  },
  "foto": "/api/me/foto/07747c26-...?v=e2e12a91-..."
}
```

### `PATCH /api/me`

Hanya nomor kontak yang bisa diubah. Nama, NIP, jabatan, bidang, dan role dikelola admin; field lain di body diabaikan.

**Body**: `{ "kontak": "0812-3456" }` (`null` untuk mengosongkan; angka, `+`, `(`, `)`, `-`, spasi; maks. 50)

**Respons 200**: profil terbaru.

### `POST /api/me/foto`, `DELETE /api/me/foto`, `GET /api/me/foto/:userId`

Ganti, hapus, dan tampilkan foto profil. Foto JPEG/PNG/WebP maks. 2 MB, dipotong 320×320 dan disimpan sebagai WebP tanpa EXIF. Galat 413 (terlalu besar) dan 415 (bukan gambar).

### `PATCH /api/me/email`

Mengajukan ganti email. Tautan verifikasi dikirim ke email baru; email lama diberi tahu dan **tetap dipakai login sampai email baru diverifikasi**.

**Body**: `{ "email": "baru@contoh.com", "password": "<kata sandi saat ini>" }`

**Respons 200**: `{ "emailBaru": "baru@contoh.com", "kedaluwarsa": "..." }`

**Galat**: 422 (`password` salah, email sama, atau sudah dipakai akun lain), 429 (lebih dari 5 per jam), 502 (email gagal dikirim).

### `DELETE /api/me/email`

Membatalkan ganti email yang belum diverifikasi. **Respons 200**: `{ "emailBaru": null }`. **Galat**: 422 bila tidak ada.

### `PATCH /api/me/sandi`

**Body**

| Field | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `sandiLama` | string | ya | |
| `sandiBaru` | string | ya | Kebijakan kata sandi, berbeda dari yang lama |
| `cabutSesiLain` | boolean | tidak | Bawaan `true`: sesi di perangkat lain dicabut, sesi ini tetap |

**Respons 200**: `{ "sesiDicabut": 1 }`. Pemilik akun menerima email pemberitahuan.

**Galat**: 422 (`sandiLama` salah atau `sandiBaru` tidak memenuhi syarat), 429 (lebih dari 5 percobaan per 15 menit).

### `GET /api/me/sesi`

Sesi login yang masih berlaku. Token sesi tidak pernah dikirim.

```json
[
  { "id": "155f046f-...", "ipAddress": "10.0.0.5", "userAgent": "Mozilla/5.0 ...", "createdAt": "...", "updatedAt": "...", "expiresAt": "...", "sesiIni": true }
]
```

### `DELETE /api/me/sesi/:id`

Mencabut satu sesi di perangkat lain. **Galat**: 422 bila sesi yang sedang dipakai (gunakan logout), 404 bila bukan milik Anda atau sudah berakhir.

### `DELETE /api/me/sesi`

Mencabut semua sesi selain sesi ini. **Respons 200**: `{ "jumlah": 2 }`.

### `GET /api/me/preferensi`, `PATCH /api/me/preferensi`

Disimpan terpisah dari data autentikasi (tabel `preferensi_pengguna`). `PATCH` menerima sebagian field.

```json
{ "tema": "system", "notifPengingatKegiatan": true, "notifPengingatDokumentasi": true }
```

| Field | Nilai |
| --- | --- |
| `tema` | `light`, `dark`, `system` |
| `notifPengingatKegiatan` | Email pengingat H-1 kegiatan |
| `notifPengingatDokumentasi` | Email pengingat kegiatan selesai tanpa dokumentasi |

---

## Menghubungi administrator (permintaan akses)

Bukan pendaftaran: permintaan ini tidak membuat akun. Admin memverifikasi identitas lalu membuat akun (lihat [api-admin.md](api-admin.md#permintaan-akun)).

### `POST /api/permintaan-akun`

**Akses**: Publik (maks. 3 per jam per IP)

**Body**

| Field | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `nama` | string | ya | 1–150 karakter |
| `email` | string | ya | Email pribadi |
| `nip` | string \| null | tidak | 18 digit. Bila diisi, harus terdaftar sebagai pegawai aktif |
| `catatan` | string \| null | tidak | Maks. 500 karakter |

**Respons 201**: `{ "id": 1 }`

**Galat**: 422 (NIP tidak sah/terdaftar, sudah punya akun, atau sudah ada permintaan menunggu), 429.
