# 4. Class

## 4.1 Kelas domain

Diturunkan dari model Prisma. Atribut teknis (`createdAt`, `updatedAt`, token Better Auth) tidak ditulis agar diagram tetap terbaca; daftar kolom lengkap ada di [ERD](05-erd.md).

```mermaid
classDiagram
    direction LR

    class User {
        +String id
        +String name
        +String email
        +Boolean emailVerified
        +String role  «PEGAWAI, PIMPINAN, ADMIN»
        +Boolean banned
        +String kontak
        +Int failedLoginCount
        +DateTime lockedUntil
        +statusAkun() StatusAkun
    }
    class Pegawai {
        +Int id
        +String nip  «opsional, 18 digit»
        +String nama
        +String jabatan
        +Boolean aktif
    }
    class Bidang {
        +Int id
        +String kode
        +String nama
        +Boolean aktif
    }
    class JenisKegiatan {
        +Int id
        +String nama
        +Boolean aktif
    }
    class Kegiatan {
        +Int id
        +String judul
        +String uraian
        +String lokasiNama
        +Decimal lat
        +Decimal lng
        +DateTime tglMulai
        +DateTime tglSelesai
        +Int jumlahPeserta
        +String hasil
        +DateTime dibatalkanAt
        +String alasanBatal
        +String statusPemeriksaan
        +DateTime deletedAt
        +statusPelaksanaan() StatusPelaksanaan
    }
    class Dokumentasi {
        +Int id
        +String path
        +String namaAsli
        +String mime
        +Int ukuran
        +String sha256
    }
    class CatatanPemeriksaan {
        +Int id
        +String status
        +String isi
    }
    class DrafKegiatan {
        +Int id
        +Json isi
    }
    class PermintaanAkun {
        +Int id
        +String nama
        +String email
        +StatusPermintaan status
        +String alasanTolak
    }
    class Pengingat {
        +Int id
        +JenisPengingat jenis
        +DateTime dikirimAt
    }
    class AuditLog {
        +BigInt id
        +String aktorId
        +String aksi
        +String entitas
        +String entitasId
        +Json dataSebelum
        +Json dataSesudah
    }
    class Session {
        +String id
        +String ipAddress
        +String userAgent
        +DateTime expiresAt
    }
    class PreferensiPengguna {
        +String tema
        +Boolean notifPengingatKegiatan
        +Boolean notifPengingatDokumentasi
    }

    User "0..*" --> "0..1" Pegawai : tertaut ke
    Pegawai "0..*" --> "1" Bidang : bekerja di
    Bidang "0..*" --> "0..1" Bidang : induk (sub bidang punya induk)

    Kegiatan "0..*" --> "1" JenisKegiatan : berjenis
    Kegiatan "0..*" --> "1" Bidang : milik bidang
    Kegiatan "0..*" --> "1" Pegawai : penanggung jawab
    Kegiatan "0..*" --> "1" User : dibuat oleh
    Kegiatan "1" *-- "0..10" Dokumentasi : memiliki
    Kegiatan "1" *-- "0..*" CatatanPemeriksaan : memiliki
    Kegiatan "1" *-- "0..*" Pengingat : memiliki

    Dokumentasi "0..*" --> "1" User : diunggah oleh
    CatatanPemeriksaan "0..*" --> "1" User : pemeriksa
    DrafKegiatan "0..*" --> "1" User : pemilik
    PermintaanAkun "0..*" --> "0..1" Pegawai : untuk
    PermintaanAkun "0..*" --> "0..1" User : diproses oleh
    Pengingat "0..*" --> "1" User : penerima
    User "1" *-- "0..*" Session : memiliki
    User "1" *-- "0..1" PreferensiPengguna : memiliki
    AuditLog ..> User : aktorId (teks, tanpa kunci asing)
```

## 4.2 Lapisan backend

Setiap fitur di `apps/api/src` mengikuti pola yang sama. Contoh untuk kegiatan:

```mermaid
classDiagram
    direction LR

    class kegiatanRoute {
        <<route>>
        GET /api/kegiatan
        GET /api/kegiatan/:id
        POST /api/kegiatan
        PATCH /api/kegiatan/:id
        POST /api/kegiatan/:id/batalkan
        POST /api/kegiatan/:id/pemeriksaan
        DELETE /api/kegiatan/:id
    }
    class KegiatanValidator {
        <<validator>>
        skema body dan query (TypeBox)
    }
    class KegiatanController {
        <<controller>>
        meneruskan params, body, user, meta
    }
    class KegiatanService {
        <<service>>
        +daftar(query, aktor)
        +detail(id, aktor)
        +buat(isi, aktor, meta)
        +ubah(id, isi, aktor, meta)
        +batalkan(id, isi, aktor, meta)
        +periksa(id, isi, aktor, meta)
        +hapus(id, aktor, meta)
    }
    class KegiatanRepository {
        <<repository>>
        query Prisma, kondisi lingkup baca,
        updateDenganVersi (409 bila bentrok)
    }
    class AuditLogService {
        <<service>>
        +catat(aksi, entitas, sebelum, sesudah)
    }
    class PrismaClient {
        <<lib/prisma>>
    }

    kegiatanRoute ..> KegiatanValidator : memvalidasi dengan
    kegiatanRoute --> KegiatanController : memanggil
    KegiatanController --> KegiatanService : memanggil
    KegiatanService --> KegiatanRepository : memakai
    KegiatanService --> AuditLogService : mencatat
    KegiatanRepository --> PrismaClient
    AuditLogService --> PrismaClient
```

| Lapisan | Tanggung jawab | Contoh berkas |
| --- | --- | --- |
| Route | Alamat, metode HTTP, role yang diizinkan, validator | `routes/kegiatan.route.ts` |
| Controller | Mengambil params, body, pengguna, dan meta permintaan | `controllers/kegiatan.controller.ts` |
| Service | Aturan bisnis, hak akses, transaksi, audit log | `services/kegiatan.service.ts` |
| Repository | Query Prisma saja | `repositories/kegiatan.repository.ts` |
