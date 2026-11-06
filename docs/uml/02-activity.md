# 2. Activity

## 2.1 Mencatat kegiatan sampai dokumentasi

Kegiatan dicatat dalam dua langkah. Isian yang belum selesai bisa disimpan sebagai draf. Dokumentasi dan hasil dilengkapi setelah kegiatan berlangsung; status pelaksanaan dihitung otomatis dari waktu.

```mermaid
flowchart TD
    mulai([Mulai]) --> buka[Buka Tambah kegiatan]
    buka --> langkah1["Langkah 1: judul, jenis, waktu mulai dan selesai,<br/>penanggung jawab, bidang"]
    langkah1 --> lanjut{Lanjut sekarang?}
    lanjut -- Belum --> draf[(Simpan sebagai draf)]
    draf --> akhirDraf([Selesai, lanjutkan nanti dari Draf saya])
    lanjut -- Ya --> langkah2["Langkah 2: lokasi (opsional, peta atau koordinat),<br/>uraian, jumlah peserta, nomor surat"]
    langkah2 --> simpan[Simpan]
    simpan --> valid{Valid di backend?}
    valid -- "Tidak (422)" --> perbaiki[Tampilkan galat per kolom] --> langkah2
    valid -- Ya --> tercatat[(Kegiatan tersimpan + audit log)]
    tercatat --> status{"Status pelaksanaan<br/>(dihitung dari waktu)"}
    status -- Akan datang --> h1[Penjadwal mengirim pengingat H-1]
    h1 --> status
    status -- Berlangsung --> tunggu[Kegiatan berjalan]
    tunggu --> status
    status -- Selesai --> lengkap{Dokumentasi dan hasil lengkap?}
    lengkap -- Belum --> ingatDok[Detail menampilkan peringatan,<br/>penjadwal mengirim pengingat dokumentasi]
    ingatDok --> unggah["Unggah foto/PDF (maks. 10 berkas, 20 MB)<br/>dan isi hasil"]
    unggah --> lengkap
    lengkap -- Ya --> periksa{Pimpinan memeriksa?}
    periksa -- Tidak --> akhir([Selesai])
    periksa -- "Perlu perbaikan (catatan wajib)" --> ubah[Pemilik mengubah kegiatan] --> periksa
```

Kegiatan yang tidak jadi dilaksanakan dibatalkan (alasan wajib, tetap tercatat sebagai *Dibatalkan*). Menghapus kegiatan mengeluarkannya dari daftar dan rekap.

## 2.2 Akun: dari permintaan sampai aktif

Tidak ada pendaftaran mandiri. Akun dibuat admin, baik langsung maupun dari permintaan akun, lalu pemiliknya membuat sandi sendiri lewat tautan email.

```mermaid
flowchart TD
    mulai([Mulai]) --> jalur{Siapa memulai?}
    jalur -- Calon pengguna --> minta[Isi form Minta akun di halaman login]
    minta --> tersimpan[(Permintaan MENUNGGU)]
    tersimpan --> notif[Email ke semua admin]
    notif --> tinjau{Admin meninjau}
    tinjau -- Tolak --> tolak[(Permintaan DITOLAK + alasan)] --> akhirTolak([Selesai])
    tinjau -- Setujui --> buat
    jalur -- Admin --> buat["Admin membuat akun: nama, email pribadi,<br/>NIP opsional, bidang, role"]
    buat --> token["Buat token aktivasi<br/>(disimpan sebagai hash SHA-256)"]
    token --> kirim[Kirim email undangan lewat Brevo]
    kirim --> terkirim{Email terkirim?}
    terkirim -- Tidak --> galat[Akun tetap tersimpan,<br/>admin melihat galat] --> ulang[Admin: Kirim ulang undangan] --> token
    terkirim -- Ya --> klik[Pemilik membuka tautan aktivasi]
    klik --> berlaku{Token berlaku?}
    berlaku -- "Tidak (kedaluwarsa/dipakai)" --> ulang
    berlaku -- Ya --> sandi["Pemilik membuat sandi<br/>(min. 8 karakter, huruf dan angka)"]
    sandi --> aktif[(Akun AKTIF + audit log)]
    aktif --> login[Login dengan email dan sandi] --> akhir([Selesai])
```
