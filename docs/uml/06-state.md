# 6. State

## 6.1 Status pelaksanaan kegiatan

Tidak disimpan di database; dihitung setiap kali dibaca dari `tgl_mulai`, `tgl_selesai`, `dibatalkan_at`, dan waktu sekarang (`hitungStatus`). Karena itu status tidak bisa dipilih manual: untuk membuat kegiatan langsung *Selesai*, ubah waktu selesainya.

```mermaid
stateDiagram-v2
    [*] --> AkanDatang : dicatat, waktu mulai belum tiba
    [*] --> Berlangsung : dicatat saat sedang berjalan
    [*] --> Selesai : dicatat setelah berakhir

    AkanDatang --> Berlangsung : waktu mulai tiba
    Berlangsung --> Selesai : waktu selesai lewat
    Berlangsung --> Selesai : tombol Selesaikan sekarang (waktu selesai menjadi sekarang)
    AkanDatang --> Selesai : waktu diubah ke masa lalu
    Selesai --> AkanDatang : waktu diubah ke masa depan

    AkanDatang --> Dibatalkan : Batalkan (alasan wajib)
    Berlangsung --> Dibatalkan : Batalkan (alasan wajib)
    Selesai --> Dibatalkan : Batalkan (alasan wajib)
    Dibatalkan --> [*]

    AkanDatang : Akan datang
    Berlangsung : Berlangsung
    Selesai : Selesai
    Dibatalkan : Dibatalkan (tidak dapat diurungkan)
```

## 6.2 Status pemeriksaan kegiatan

Disimpan di `kegiatan.status_pemeriksaan`. Pimpinan hanya menandai kegiatan yang perlu perbaikan; kegiatan yang tidak ditandai tetap sah. `terkirim` adalah keadaan biasa dan tidak ditampilkan. Setiap perubahan kegiatan oleh pemiliknya mengembalikan status ke `terkirim`.

```mermaid
stateDiagram-v2
    [*] --> terkirim : kegiatan disimpan
    terkirim --> perlu_perbaikan : pimpinan menandai Perlu perbaikan (catatan wajib)
    perlu_perbaikan --> perlu_perbaikan : pimpinan menambah catatan
    perlu_perbaikan --> terkirim : kegiatan diperbaiki pemiliknya

    terkirim : Terkirim (tanpa tanda)
    perlu_perbaikan : Perlu perbaikan
```

## 6.3 Status akun

Diturunkan dari data (lihat catatan di [ERD](05-erd.md)), bukan kolom tersendiri.

```mermaid
stateDiagram-v2
    [*] --> MenungguAktivasi : admin membuat akun / menyetujui permintaan
    MenungguAktivasi --> MenungguAktivasi : kirim ulang undangan (token lama batal)
    MenungguAktivasi --> Aktif : pemilik membuat sandi lewat tautan
    Aktif --> Terkunci : 5 kali salah sandi
    Terkunci --> Aktif : 15 menit berlalu
    Aktif --> Nonaktif : admin menonaktifkan (sesi dicabut)
    MenungguAktivasi --> Nonaktif : admin menonaktifkan
    Nonaktif --> Aktif : admin mengaktifkan kembali
    MenungguAktivasi --> [*] : admin menghapus
    Aktif --> [*] : admin menghapus (hanya bila belum meninggalkan data kegiatan)
    Nonaktif --> [*] : admin menghapus (syarat sama)

    MenungguAktivasi : Menunggu aktivasi
    Aktif : Aktif
    Terkunci : Terkunci sementara (masih Aktif)
    Nonaktif : Nonaktif
```

## 6.4 Status permintaan akun

```mermaid
stateDiagram-v2
    [*] --> MENUNGGU : calon pengguna mengisi Minta akun
    MENUNGGU --> DISETUJUI : admin menyetujui, akun dibuat dan undangan dikirim
    MENUNGGU --> DITOLAK : admin menolak (alasan)
    DISETUJUI --> [*]
    DITOLAK --> [*]
```
