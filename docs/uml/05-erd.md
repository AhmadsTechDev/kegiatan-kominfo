# 5. ERD

Nama tabel dan kolom memakai snake_case seperti di PostgreSQL. Sumber: `apps/api/prisma/schema.prisma`.

```mermaid
erDiagram
    user {
        varchar id PK
        varchar name
        varchar email UK
        boolean email_verified
        varchar email_baru
        text image
        varchar role
        boolean banned
        text ban_reason
        int pegawai_id FK
        varchar kontak
        int failed_login_count
        timestamptz locked_until
    }
    session {
        varchar id PK
        varchar token UK
        timestamptz expires_at
        varchar ip_address
        text user_agent
        varchar user_id FK
    }
    account {
        varchar id PK
        varchar account_id
        varchar provider_id
        text password
        varchar user_id FK
    }
    verification {
        varchar id PK
        varchar identifier
        text value
        timestamptz expires_at
    }
    preferensi_pengguna {
        varchar user_id PK, FK
        varchar tema
        boolean notif_pengingat_kegiatan
        boolean notif_pengingat_dokumentasi
    }
    bidang {
        int id PK
        int parent_id FK
        varchar kode UK
        varchar nama
        boolean aktif
    }
    pegawai {
        int id PK
        varchar nip UK
        varchar nama
        varchar jabatan
        int bidang_id FK
        boolean aktif
    }
    jenis_kegiatan {
        int id PK
        varchar nama UK
        boolean aktif
    }
    kegiatan {
        int id PK
        varchar judul
        int jenis_id FK
        text uraian
        varchar lokasi_nama
        decimal lat
        decimal lng
        timestamptz tgl_mulai
        timestamptz tgl_selesai
        int bidang_id FK
        int penanggung_jawab_id FK
        varchar dibuat_oleh FK
        int jumlah_peserta
        text hasil
        timestamptz dibatalkan_at
        text alasan_batal
        varchar ref_eksternal
        varchar status_pemeriksaan
        timestamptz updated_at "versi untuk deteksi bentrok (409)"
        timestamptz deleted_at
    }
    catatan_pemeriksaan {
        int id PK
        int kegiatan_id FK
        varchar pemeriksa_id FK
        varchar status
        text isi
    }
    dokumentasi {
        int id PK
        int kegiatan_id FK
        varchar path
        varchar nama_asli
        varchar mime
        int ukuran
        char sha256
        varchar diunggah_oleh FK
    }
    draf_kegiatan {
        int id PK
        varchar pemilik_id FK
        json isi
    }
    permintaan_akun {
        int id PK
        int pegawai_id FK
        varchar nama
        varchar email
        text catatan
        status_permintaan status
        text alasan_tolak
        varchar diproses_oleh FK
        timestamptz diproses_at
    }
    pengingat {
        int id PK
        int kegiatan_id FK
        jenis_pengingat jenis
        varchar user_id FK
        timestamptz created_at
    }
    audit_log {
        bigint id PK
        varchar aktor_id "tanpa kunci asing"
        varchar aksi
        varchar entitas
        varchar entitas_id
        json data_sebelum
        json data_sesudah
        varchar ip
        text user_agent
        timestamptz created_at
    }

    pegawai |o--o{ user : "tertaut (SET NULL)"
    user ||--o{ session : "CASCADE"
    user ||--o{ account : "CASCADE"
    user ||--o| preferensi_pengguna : "CASCADE"
    bidang |o--o{ bidang : "induk (RESTRICT)"
    bidang ||--o{ pegawai : "RESTRICT"
    bidang ||--o{ kegiatan : "RESTRICT"
    jenis_kegiatan ||--o{ kegiatan : "RESTRICT"
    pegawai ||--o{ kegiatan : "penanggung jawab (RESTRICT)"
    user ||--o{ kegiatan : "pembuat (RESTRICT)"
    kegiatan ||--o{ dokumentasi : "CASCADE"
    user ||--o{ dokumentasi : "pengunggah (RESTRICT)"
    kegiatan ||--o{ catatan_pemeriksaan : "CASCADE"
    user ||--o{ catatan_pemeriksaan : "pemeriksa (RESTRICT)"
    user ||--o{ draf_kegiatan : "CASCADE"
    pegawai |o--o{ permintaan_akun : "RESTRICT"
    user |o--o{ permintaan_akun : "pemroses (SET NULL)"
    kegiatan ||--o{ pengingat : "CASCADE"
    user ||--o{ pengingat : "CASCADE"
```

## Catatan

- **Status akun tidak disimpan**, melainkan diturunkan: belum punya baris `account` berarti *Menunggu aktivasi*, `banned = true` berarti *Nonaktif*, selain itu *Aktif*.
- **Token** aktivasi, atur ulang sandi, dan ganti email disimpan di `verification` sebagai hash SHA-256, bukan teks asli.
- **Data master** (`bidang`, `pegawai`, `jenis_kegiatan`) tidak dihapus, cukup dinonaktifkan lewat kolom `aktif`.
- **Tabel `bidang`** berisi bidang dan sub bidang. Tingkatnya ditentukan `parent_id`: kosong berarti bidang, terisi berarti sub bidang (maksimal dua tingkat). Tabel ini dulu bernama `unit_kerja` (migrasi `2_ganti_nama_unit_kerja_jadi_bidang`, data tetap utuh), dan tabel `jenis_unit` sudah dihapus (migrasi `3_hapus_jenis_unit`).
- **Kegiatan dihapus secara lunak** (`deleted_at`), sehingga riwayat audit tetap merujuk ke data yang ada.
- **`audit_log` append-only.** `aktor_id` sengaja tanpa kunci asing agar riwayat tetap utuh setelah akun dihapus.
- Aturan `RESTRICT` pada pembuat kegiatan, pengunggah dokumentasi, dan pemeriksa adalah alasan akun yang sudah meninggalkan data kegiatan tidak bisa dihapus (cukup dinonaktifkan).
- `pengingat` unik per (`kegiatan_id`, `jenis`, `user_id`), sehingga setiap pengingat hanya terkirim sekali.
