# 3. Sequence

Frontend dan backend berbagi satu origin: Next.js meneruskan `/api/*` ke backend, sehingga cookie sesi milik domain frontend.

## 3.1 Login dengan penguncian akun

Login ditangani Better Auth (`POST /api/auth/sign-in/email`). Hook di `apps/api/src/lib/auth.ts` menolak akun yang terkunci sebelum sandi dicek, lalu mencatat hasilnya: lima kali salah mengunci akun selama 15 menit. Batas laju 30 percobaan per menit per IP.

```mermaid
sequenceDiagram
    autonumber
    actor U as Pengguna
    participant W as Frontend (Next.js)
    participant A as Backend (Elysia + Better Auth)
    participant S as AuthService
    participant DB as PostgreSQL

    U->>W: Isi email dan sandi, klik Masuk
    W->>A: POST /api/auth/sign-in/email
    A->>A: Batas laju (30/menit per IP)
    A->>S: hook before: tolakJikaTerkunci(email)
    S->>DB: SELECT locked_until FROM user
    alt Akun terkunci
        S-->>A: 429 TOO_MANY_REQUESTS (akun terkunci)
        A-->>W: Galat
        W-->>U: "Akun terkunci, coba lagi nanti"
    else Tidak terkunci
        A->>DB: Cek akun dan hash sandi
        alt Sandi benar dan akun aktif
            A->>DB: INSERT session
            A->>S: hook after: catatLoginBerhasil
            S->>DB: Reset failed_login_count
            A-->>W: 200 + Set-Cookie sesi
            W-->>U: Masuk ke dashboard
        else Sandi salah
            A->>S: hook after: catatLoginGagal
            S->>DB: failed_login_count + 1, kunci 15 menit bila mencapai 5
            A-->>W: 401
            W-->>U: "Email atau kata sandi salah"
        end
    end
```

## 3.2 Aktivasi akun lewat email

```mermaid
sequenceDiagram
    autonumber
    actor Adm as Admin
    actor P as Pemilik akun
    participant W as Frontend
    participant A as Backend
    participant K as KredensialService
    participant DB as PostgreSQL
    participant B as Brevo (email)

    Adm->>W: Buat akun (Manajemen akun)
    W->>A: POST /api/admin/akun
    A->>DB: INSERT user (+ pegawai bila baru)
    A->>K: buatTokenAktivasi
    K->>DB: INSERT verification (hash SHA-256 token)
    K->>B: Kirim email undangan berisi tautan /aktivasi?token=...
    alt Email gagal
        A-->>W: 201 + galat email (akun tetap tersimpan)
        W-->>Adm: Tampilkan galat, tombol Kirim ulang undangan
    else Email terkirim
        A-->>W: 201
    end

    P->>W: Buka tautan aktivasi
    W->>A: GET /api/me/aktivasi?token=...
    A->>DB: Cari hash token yang belum kedaluwarsa
    A-->>W: Nama, email, batas waktu (atau galat tautan tidak berlaku)
    P->>W: Buat kata sandi
    W->>A: POST /api/me/aktivasi {token, password}
    A->>K: aktivasi
    K->>DB: INSERT account (hash sandi), email_verified = true
    K->>DB: DELETE verification
    A-->>W: 200 {email}
    W-->>P: Arahkan ke halaman login
```

## 3.3 Unggah dokumentasi

Kuota dicek sebelum dan sesudah berkas diproses (di dalam kunci transaksi), sehingga dua unggahan bersamaan tidak melewati batas 10 berkas.

```mermaid
sequenceDiagram
    autonumber
    actor U as Pemilik kegiatan
    participant W as Frontend
    participant A as Backend
    participant D as DokumentasiService
    participant F as utils/berkas
    participant C as Cloudinary
    participant DB as PostgreSQL

    U->>W: Pilih foto/PDF di detail kegiatan
    W->>W: Kompres gambar di peramban
    W->>A: POST /api/kegiatan/:id/dokumentasi (multipart)
    A->>D: unggah(kegiatanId, berkas, aktor)
    D->>DB: Cek hak ubah dan kuota (< 10 berkas)
    alt Tidak berhak atau kuota penuh
        D-->>W: 403/404 atau 413
    else Boleh
        D->>F: prosesBerkas: cek magic bytes, maks. 20 MB,<br/>kompres foto, buang EXIF/GPS, hitung SHA-256
        alt Berkas ditolak
            F-->>W: 415 (jenis tidak didukung / rusak) atau 413 (di atas 20 MB)
        else Lolos
            D->>C: Simpan berkas (tipe authenticated, privat)
            D->>DB: Kunci baris kegiatan, cek ulang kuota
            D->>DB: INSERT dokumentasi
            D-->>W: 201 + data dokumentasi (tanpa path)
            W-->>U: Berkas tampil di galeri
        end
    end
    Note over W,A: Berkas dibuka lewat GET /api/dokumentasi/:id,<br/>hanya untuk pengguna yang login dan berhak membaca kegiatannya
```
