# 1. Use case

Mermaid belum punya diagram use case bawaan, jadi aktor digambar sebagai simpul di kiri dan use case sebagai simpul membulat di dalam batas sistem.

Hak akses ditegakkan di backend pada setiap permintaan: Pegawai melihat kegiatan bidangnya dan mengubah kegiatan miliknya, Pimpinan melihat seluruh dinas tanpa mengubah data, Admin mengelola semuanya. Kegiatan di luar lingkup dijawab 404.

```mermaid
flowchart LR
    tamu(["👤 Tamu<br/>(belum login)"])
    pegawai(["👤 Pegawai"])
    pimpinan(["👤 Pimpinan"])
    admin(["👤 Admin"])
    jadwal(["⏱ Penjadwal<br/>(pengingat.job)"])

    subgraph sistem["Aplikasi Pendataan Kegiatan"]
        direction TB
        uc_login(["Login dengan email"])
        uc_minta(["Minta akun"])
        uc_aktivasi(["Aktivasi akun dan buat sandi"])
        uc_lupa(["Lupa / atur ulang sandi"])
        uc_pengaturan(["Kelola profil, email, sandi,<br/>sesi, preferensi"])

        uc_catat(["Catat kegiatan (2 langkah, draf)"])
        uc_ubah(["Ubah, isi hasil, batalkan,<br/>hapus kegiatan"])
        uc_unggah(["Unggah dokumentasi foto/PDF"])
        uc_lihat(["Lihat daftar, detail, kalender,<br/>dashboard"])
        uc_rekap(["Lihat rekap dan ekspor PDF"])

        uc_pantau(["Pantau pemeriksaan kegiatan"])
        uc_periksa(["Periksa kegiatan<br/>(sudah diperiksa / perlu perbaikan)"])

        uc_akun(["Kelola akun: buat/undang, ubah role,<br/>nonaktifkan, hapus, reset sandi, cabut sesi"])
        uc_tinjau(["Setujui / tolak permintaan akun"])
        uc_master(["Kelola master data: bidang, sub bidang,<br/>pegawai, jenis kegiatan"])
        uc_audit(["Lihat audit log"])

        uc_ingat(["Kirim email pengingat<br/>H-1 dan dokumentasi"])
    end

    tamu --- uc_login & uc_minta & uc_aktivasi & uc_lupa

    pegawai --- uc_pengaturan & uc_catat & uc_ubah & uc_unggah & uc_lihat & uc_rekap
    pimpinan --- uc_pengaturan & uc_lihat & uc_rekap & uc_pantau & uc_periksa
    admin --- uc_pengaturan & uc_catat & uc_ubah & uc_unggah & uc_lihat & uc_rekap
    admin --- uc_akun & uc_tinjau & uc_master & uc_audit

    jadwal --- uc_ingat

    uc_catat -. include .-> uc_unggah
    uc_tinjau -. include .-> uc_akun
    uc_akun -. include .-> uc_aktivasi
```

## Ringkasan per aktor

| Aktor | Use case utama |
| --- | --- |
| Tamu | Login, minta akun, aktivasi lewat tautan email, lupa sandi |
| Pegawai | Catat dan ubah kegiatan miliknya, unggah dokumentasi, lihat kegiatan bidangnya, rekap, Pengaturan |
| Pimpinan | Lihat seluruh dinas (dashboard, kalender, rekap, ekspor), pantau dan periksa kegiatan, tanpa mengubah data kegiatan |
| Admin | Semua yang dilakukan Pegawai untuk seluruh dinas, ditambah akun, permintaan akun, master data, dan audit log |
| Penjadwal | Setiap 15 menit mengirim pengingat kegiatan H-1 dan pengingat dokumentasi bagi kegiatan yang sudah selesai |
