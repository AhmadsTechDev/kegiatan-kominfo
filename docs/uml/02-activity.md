# 2. Activity Diagram

Sesuai **Subbab 4.7.2 (Gambar 4.3 s.d. Gambar 4.6)** Laporan KP.

## 2.1 Activity Diagram Login

Menggambarkan proses pengguna masuk ke aplikasi, termasuk penguncian akun selama 15 menit setelah lima kali salah kata sandi (`Gambar 4.3`).

```mermaid
flowchart TD
    mulai([Mulai]) --> buka[Pengguna membuka halaman login]
    buka --> isi[Mengisi email dan kata sandi]
    isi --> terkunci{Akun sedang terkunci?}
    terkunci -- Ya --> pesanTerkunci[Sistem menampilkan pesan coba lagi nanti] --> isi
    terkunci -- Tidak --> valid{Email dan sandi benar?}
    valid -- Tidak --> tambahGagal["Sistem menambah jumlah gagal; gagal ke-5<br/>mengunci akun 15 menit"]
    tambahGagal --> pesanSalah[Tampilkan pesan email atau sandi salah] --> isi
    valid -- Ya --> sesi[Sistem membuat sesi login]
    sesi --> dash[Tampilkan dashboard sesuai peran]
    dash --> akhir([Selesai])
```

## 2.2 Activity Diagram Mencatat Kegiatan sampai Dokumentasi

Kegiatan dicatat dalam dua langkah. Isian yang belum selesai bisa disimpan sebagai draf. Dokumentasi dan hasil dilengkapi setelah kegiatan berlangsung; status pelaksanaan dihitung otomatis dari waktu (`Gambar 4.4`).

```mermaid
flowchart TD
    mulai([Mulai]) --> buka[Buka Tambah kegiatan]
    buka --> langkah1["Langkah 1: judul, jenis, perkiraan jumlah peserta,<br/>dan uraian kegiatan"]
    langkah1 --> lanjut{Lanjut sekarang?}
    lanjut -- Belum --> draf[(Simpan sebagai draf)]
    draf --> akhirDraf([Selesai, lanjutkan nanti dari Draf saya])
    lanjut -- Ya --> langkah2["Langkah 2: waktu mulai dan selesai,<br/>serta lokasi (opsional, peta atau koordinat)"]
    langkah2 --> simpan[Simpan]
    simpan --> valid{Valid di backend?}
    valid -- "Tidak (422)" --> perbaiki[Tampilkan galat per kolom] --> langkah2
    valid -- Ya --> tercatat[(Kegiatan tersimpan)]
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

## 2.3 Activity Diagram Memeriksa Kegiatan

Menggambarkan proses pimpinan (atau admin) memeriksa kegiatan. Kegiatan yang ditandai *Perlu perbaikan* memicu notifikasi kepada pemilik kegiatan (`Gambar 4.5`).

```mermaid
flowchart TD
    mulai([Mulai]) --> buka[Pimpinan membuka halaman Pemeriksaan]
    buka --> saring[Menyaring kegiatan per bidang, pegawai, atau tanggal]
    saring --> detail[Membuka detail kegiatan]
    detail --> sesuai{Kegiatan sudah sesuai?}
    sesuai -- Ya --> akhir([Selesai])
    sesuai -- Tidak --> tandai[Tandai Perlu perbaikan dan tulis catatan]
    tandai --> notif[Sistem menyimpan catatan dan mengirim notifikasi ke pemilik kegiatan]
    notif --> perbaiki[Pegawai memperbaiki kegiatan]
    perbaiki --> detail
```

## 2.4 Activity Diagram Membuat Laporan PDF

Menggambarkan proses mencetak atau mengunduh laporan PDF berkop dinas berdasarkan periode, bidang, dan pegawai yang dipilih (`Gambar 4.6`).

```mermaid
flowchart TD
    mulai([Mulai]) --> buka[Pengguna membuka halaman Laporan]
    buka --> filter[Memilih periode, bidang, dan pegawai]
    filter --> pratinjau[Sistem menampilkan pratinjau laporan]
    pratinjau --> ada{Ada kegiatan?}
    ada -- Tidak --> filter
    ada -- Ya --> aksi{Cetak atau unduh?}
    aksi -- Unduh PDF --> limit{Melebihi 10 ekspor per menit?}
    limit -- Ya --> tunggu[Tampilkan pesan tunggu sebentar] --> aksi
    limit -- Tidak --> buatPdf[Sistem membuat PDF berkop dinas]
    buatPdf --> unduh[PDF diunduh] --> akhir([Selesai])
    aksi -- Cetak --> dialog[Peramban membuka dialog cetak] --> akhir
```
