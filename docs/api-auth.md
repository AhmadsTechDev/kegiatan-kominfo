# API Autentikasi dan Profil

Kembali ke [ringkasan](README.md).

Login, logout, dan sesi ditangani library **Better Auth** di `/api/auth/*`. Pendaftaran mandiri tidak ada: akun dibuat admin (lihat [api-admin.md](api-admin.md)), lalu pengguna mengaktifkannya lewat email undangan.

---

## Login dengan email

### `POST /api/auth/sign-in/email`

**Akses**: Publik

**Header**: `Content-Type: application/json`

**Body**

| Field | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `email` | string | ya | |
| `password` | string | ya | |
| `rememberMe` | boolean | tidak | Bawaan `true` |

```json
{ "email": "admin@diskominfo.local", "password": "sandirahasia123" }
```

**Respons 200**: server memasang cookie sesi lewat header `Set-Cookie`.

```
Set-Cookie: better-auth.session_token=...; Max-Age=28800; Path=/; HttpOnly; SameSite=Lax
```

```json
{
  "redirect": false,
  "token": "kzns7P46mcygAAKFYevhVVZ5yQaThkkG",
  "user": {
    "id": "1ef5cd20-31a9-4698-a05d-ab22baaf7821",
    "name": "Administrator",
    "email": "admin@diskominfo.local",
    "emailVerified": false,
    "image": null,
    "username": null,
    "displayUsername": null,
    "role": "ADMIN",
    "banned": false,
    "banReason": null,
    "banExpires": null,
    "pegawaiId": null,
    "createdAt": "2026-11-01T22:10:39.176Z",
    "updatedAt": "2026-11-01T22:10:52.113Z"
  }
}
```

**Galat**

| Status | `code` | Kapan |
| --- | --- | --- |
| 401 | `INVALID_EMAIL_OR_PASSWORD` | Email atau kata sandi salah |
| 403 | `BANNED_USER` | Akun dinonaktifkan admin |
| 429 | `ACCOUNT_LOCKED` | Salah 5 kali; ada tambahan field `lockedUntil` (waktu kunci berakhir) |
| 429 | | Lebih dari 10 percobaan per menit dari IP yang sama |

## Login dengan NIP

### `POST /api/auth/sign-in/username`

Sama seperti login email, tetapi body memakai NIP sebagai `username`.

```json
{ "username": "198702152011012002", "password": "sandirahasia123" }
```

Galat untuk NIP/kata sandi salah: 401 `INVALID_USERNAME_OR_PASSWORD`.

## Logout

### `POST /api/auth/sign-out`

**Akses**: Login

**Header**: `Cookie`, `Content-Type: application/json`

**Body**: `{}`

**Respons 200**: cookie sesi dihapus.

```json
{ "success": true }
```

## Cek sesi aktif

### `GET /api/auth/get-session`

**Akses**: Publik (mengembalikan `null` bila belum login)

**Header**: `Cookie`

**Respons 200**

```json
{
  "session": {
    "id": "155f046f-b6fd-4639-b8ca-db958e079ffa",
    "userId": "1ef5cd20-31a9-4698-a05d-ab22baaf7821",
    "expiresAt": "2026-11-02T06:11:41.583Z",
    "ipAddress": "127.0.0.1",
    "userAgent": "Mozilla/5.0 ..."
  },
  "user": { "id": "1ef5cd20-...", "name": "Administrator", "email": "admin@diskominfo.local", "role": "ADMIN", "pegawaiId": null }
}
```

(`user` berisi field yang sama seperti respons login.)

---

## Aktivasi akun dari email undangan

Email undangan berisi tautan `https://<frontend>/aktivasi?token=<token>`, berlaku 72 jam dan sekali pakai.

### `GET /api/aktivasi?token=<token>`

Cek token dan tampilkan siapa pemiliknya sebelum pengguna membuat kata sandi.

**Akses**: Publik

**Query**

| Field | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `token` | string | ya | 10–100 karakter |

**Respons 200**

```json
{ "nama": "Andi Saputra", "email": "andi@diskominfo.local", "kedaluwarsa": "2026-11-05T08:00:00.000Z" }
```

**Galat**: 410 `TOKEN_TIDAK_BERLAKU` bila token salah atau kedaluwarsa.

### `POST /api/auth/reset-password`

Membuat kata sandi dan mengaktifkan akun.

**Akses**: Publik

**Body**

| Field | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `token` | string | ya | Token dari tautan email |
| `newPassword` | string | ya | Minimal 10 karakter |

**Respons 200**

```json
{ "status": true }
```

**Galat**: 400 `INVALID_TOKEN` bila token salah, sudah dipakai, atau kedaluwarsa.

Setelah ini pengguna login seperti biasa. Reset kata sandi mandiri (`/api/auth/request-password-reset`) sengaja dimatikan dan dijawab 403 `RESET_DISABLED`; lupa kata sandi ditangani admin.

---

## Profil saya

### `GET /api/me`

**Akses**: Login

**Header**: `Cookie`

**Respons 200**

```json
{
  "id": "07747c26-fd62-4ab6-8584-ebf7b244fc3a",
  "name": "Andi Saputra",
  "email": "andi@diskominfo.local",
  "username": "198702152011012002",
  "role": "PEGAWAI",
  "kontak": "0812-000",
  "pegawai": {
    "id": 1,
    "nip": "198702152011012002",
    "nama": "Andi Saputra",
    "jabatan": "Analis Data",
    "unitKerja": {
      "id": 10,
      "kode": "SEKSI-DATA",
      "nama": "Seksi Pengelolaan Data dan Persediaan",
      "parent": { "id": 4, "nama": "Bidang Teknologi Informasi dan Persandian" }
    }
  },
  "foto": "/api/me/foto/07747c26-fd62-4ab6-8584-ebf7b244fc3a?v=e2e12a91-2f15-43e1-91c7-62f863513628"
}
```

`pegawai` bernilai `null` bila akun belum ditautkan ke data pegawai. `foto` bernilai `null` bila belum ada foto.

### `PATCH /api/me`

Mengubah profil sendiri. Nama dan jabatan ikut disalin ke data pegawai.

**Akses**: Login

**Header**: `Cookie`, `Content-Type: application/json`

**Body**

| Field | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `nama` | string | ya | 1–150 karakter |
| `jabatan` | string \| null | tidak | Maks. 150 karakter |
| `kontak` | string \| null | tidak | Nomor telepon: angka, `+`, `(`, `)`, `-`, spasi. Maks. 50 karakter |

```json
{ "nama": "Andi Saputra", "jabatan": "Analis Data", "kontak": "0812-000" }
```

**Respons 200**: profil terbaru (bentuk sama dengan `GET /api/me`).

**Galat**: 422 bila isian tidak valid.

### `POST /api/me/foto`

Mengganti foto profil. Foto dipotong persegi 320×320 dan diubah ke WebP; data EXIF/GPS dibuang.

**Akses**: Login

**Header**: `Cookie`, `Content-Type: multipart/form-data`

**Body (form-data)**

| Field | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `berkas` | file | ya | JPEG, PNG, atau WebP. Maks. 2 MB |

**Respons 200**

```json
{ "foto": "/api/me/foto/07747c26-...?v=e2e12a91-2f15-43e1-91c7-62f863513628" }
```

**Galat**: 413 bila lebih dari 2 MB, 415 bila bukan gambar.

### `DELETE /api/me/foto`

**Akses**: Login

**Respons 200**

```json
{ "foto": null }
```

### `GET /api/me/foto/:userId`

Menampilkan foto profil pengguna mana pun (untuk avatar).

**Akses**: Login

**Respons 200**: isi gambar.

| Header respons | Nilai |
| --- | --- |
| `Content-Type` | `image/webp` |
| `Cache-Control` | `private, max-age=86400` |

**Galat**: 404 bila pengguna belum punya foto.

---

## Mengajukan permintaan akun

Dipakai dari halaman login oleh orang yang belum punya akun. Admin diberi tahu lewat email lalu menyetujui atau menolaknya (lihat [api-admin.md](api-admin.md#permintaan-akun)).

### `POST /api/permintaan-akun`

**Akses**: Publik (maksimal 3 kali per jam per IP)

**Header**: `Content-Type: application/json`

**Body**

| Field | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `nama` | string | ya | 1–150 karakter |
| `email` | string | ya | Format email, maks. 255 karakter |
| `nip` | string \| null | tidak | 18 digit. Bila diisi, harus terdaftar sebagai pegawai aktif |
| `catatan` | string \| null | tidak | Maks. 500 karakter |

```json
{ "nama": "Budi", "email": "budi@diskominfo.local", "nip": null, "catatan": "Staf baru Bidang TIP" }
```

**Respons 201**

```json
{ "id": 1 }
```

**Galat**

| Status | Kapan |
| --- | --- |
| 422 | NIP tidak sah atau tidak terdaftar, NIP/email sudah punya akun, atau sudah ada permintaan yang menunggu |
| 429 | Lebih dari 3 permintaan per jam dari IP yang sama |
