# Dokumentasi API — Aplikasi Pendataan Kegiatan

Dokumentasi endpoint backend (`apps/api/`). Semua contoh diambil dari respons server sungguhan.

| Berkas | Isi |
| --- | --- |
| [api-auth.md](api-auth.md) | Login, logout, sesi, aktivasi akun, profil saya (`/me`), permintaan akun publik |
| [api-kegiatan.md](api-kegiatan.md) | Referensi, kegiatan, draf, dokumentasi (unggah berkas) |
| [api-laporan.md](api-laporan.md) | Dashboard, kalender, rekap, pantau, ekspor PDF |
| [api-admin.md](api-admin.md) | Data master, manajemen akun, undangan, permintaan akun, audit log |

---

## Alamat dasar

| Lingkungan | Base URL |
| --- | --- |
| Development | `http://localhost:3001/api` |
| Produksi | `https://<domain>/api` |

Semua path di dokumen ini ditulis lengkap, misalnya `GET /api/kegiatan`.

## Header permintaan

| Header | Kapan dipakai | Nilai |
| --- | --- | --- |
| `Cookie` | Semua endpoint yang butuh login | `better-auth.session_token=<token>` (di produksi namanya `__Secure-better-auth.session_token`). Cookie ini otomatis diberikan saat login. |
| `Content-Type` | Endpoint dengan body JSON | `application/json` |
| `Content-Type` | Endpoint unggah berkas | `multipart/form-data` (dibuat otomatis oleh `FormData`) |
| `Origin` | Dikirim otomatis oleh peramban | Harus sama dengan `FRONTEND_URL`. Endpoint `/api/auth/*` menolak origin lain. |

Dari frontend, panggil API dengan `credentials: "include"` agar cookie ikut terkirim:

```js
const res = await fetch("/api/kegiatan", { credentials: "include" });
```

## Role dan hak akses

| Role | Keterangan |
| --- | --- |
| `PEGAWAI` | Mencatat kegiatan. Hanya melihat kegiatan di bidangnya (beserta sub-unit) dan kegiatan miliknya. |
| `PIMPINAN` | Melihat semua kegiatan, dashboard, dan memeriksa kegiatan. Tidak bisa mencatat kegiatan. |
| `ADMIN` | Semua hak, termasuk data master, akun, dan audit log. |

Di setiap endpoint ada baris **Akses**:

- **Publik**: tanpa login.
- **Login**: semua role yang sudah login.
- **PEGAWAI, ADMIN** (dan sebagainya): hanya role yang disebut.

## Format respons sukses

- Data dikirim sebagai JSON apa adanya (tanpa pembungkus `data`).
- Waktu memakai format ISO 8601 UTC, contoh `"2026-11-01T22:10:53.043Z"`. Frontend menampilkannya dalam WIB.
- Daftar berhalaman memakai bentuk:

```json
{ "items": [], "total": 0, "page": 1, "pageSize": 20 }
```

- `204 No Content` berarti sukses tanpa isi (dipakai endpoint hapus).

## Format galat

Semua galat memakai bentuk yang sama:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Periksa kembali isian kegiatan",
  "details": [{ "field": "tglSelesai", "message": "Tanggal selesai tidak boleh sebelum tanggal mulai" }]
}
```

`details` hanya ada pada galat validasi. Tampilkan `details[].message` di bawah kolom formulir sesuai `field`.

| Status | `code` | Arti |
| --- | --- | --- |
| 400 | `BAD_REQUEST` | Body tidak bisa dibaca (misalnya JSON rusak) |
| 401 | `UNAUTHORIZED` | Belum login atau sesi habis (sesi berlaku 8 jam) |
| 403 | `FORBIDDEN` | Sudah login tetapi tidak berhak, atau akun dinonaktifkan |
| 404 | `NOT_FOUND` | Data atau endpoint tidak ditemukan. Data di luar hak baca juga dijawab 404. |
| 409 | `CONFLICT` | Data sudah diubah orang lain; muat ulang lalu ulangi |
| 410 | `TOKEN_TIDAK_BERLAKU` | Tautan aktivasi salah atau kedaluwarsa |
| 413 | `PAYLOAD_TOO_LARGE` | Berkas terlalu besar, atau kuota berkas habis |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Jenis berkas tidak didukung |
| 422 | `VALIDATION_ERROR` | Isian tidak valid (lihat `details`) |
| 429 | `TOO_MANY_REQUESTS` | Terlalu banyak permintaan dalam waktu singkat |
| 500 | `INTERNAL_ERROR` | Kesalahan server (detailnya hanya ada di log server) |
| 502 | `EMAIL_GAGAL` | Email undangan gagal dikirim (periksa SMTP) |

Galat dari endpoint login Better Auth (`/api/auth/*`) bentuknya sedikit berbeda: `{ "code": "...", "message": "..." }`. Lihat [api-auth.md](api-auth.md).

## Batas laju (rate limit)

| Endpoint | Batas |
| --- | --- |
| Login (`/api/auth/sign-in/*`) | 30 kali per menit per IP |
| Endpoint `/api/auth/*` lain | 100 kali per menit per IP |
| Login salah 5 kali berturut-turut | Akun dikunci 15 menit |
| Ekspor PDF | 10 kali per menit per akun |
| Permintaan akun publik | 3 kali per jam per IP |

## Cek kesehatan server

### `GET /api/health`

**Akses**: Publik. Dipakai Docker healthcheck.

**Respons 200**

```json
{ "status": "ok" }
```

Gagal (500) bila basis data tidak bisa dihubungi.
