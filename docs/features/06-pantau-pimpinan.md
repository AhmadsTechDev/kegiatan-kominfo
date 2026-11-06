# Pantau Pimpinan

Pimpinan bisa memantau kegiatan dan laporan tim secara terstruktur.

## Spesifikasi

### Tujuan
Memberi pimpinan satu layar untuk memantau kegiatan dan laporan tim secara terstruktur, sehingga pemeriksaan kegiatan bisa dilakukan cepat tanpa berpindah aplikasi.
### Selesai bila
- Pimpinan dapat membuka satu halaman "Pantau Pimpinan" yang menampilkan gambaran kegiatan seluruh pegawai.
- Halaman menampilkan total kegiatan dan jumlah yang perlu perbaikan dengan angka yang mudah dibaca.
- Pimpinan dapat menyaring tampilan berdasarkan pegawai atau bidang, lalu membuka detail kegiatan yang dipilih.
- Pimpinan dapat menandai kegiatan "perlu perbaikan", dan tandanya langsung terlihat di tampilan pantau.
- Hanya pengguna dengan peran pimpinan (dan admin) yang bisa mengakses halaman ini.

## Sub-fitur: Ringkasan Tim

Lihat gambaran kegiatan seluruh pegawai dalam satu layar.

### Tujuan
Menampilkan gambaran ringkas kegiatan seluruh pegawai dalam satu layar agar pimpinan langsung tahu kondisi tim.
### Selesai bila
- Satu layar menampilkan total kegiatan tim dan jumlah yang perlu perbaikan dalam angka ringkas.
- Daftar kegiatan terbaru dari seluruh pegawai tampil terurut dari yang paling baru.
- Setiap baris kegiatan menampilkan judul, nama pegawai, bidang, tanggal, dan status dengan jelas.

## Sub-fitur: Filter per Pegawai

Telusuri kegiatan berdasarkan pegawai atau bidang tertentu.

### Tujuan
Memungkinkan pimpinan menelusuri kegiatan berdasarkan pegawai atau bidang tertentu agar pemeriksaan lebih terarah.
### Selesai bila
- Tersedia pilihan penyaring pegawai dan penyaring bidang pada halaman pantau.
- Saat penyaring dipilih, daftar dan angka ringkasan ikut menyesuaikan hanya pada pegawai/bidang tersebut.
- Tersedia tombol untuk menghapus penyaring dan kembali menampilkan seluruh kegiatan tim.

## Sub-fitur: Status Kegiatan

Tandai kegiatan yang perlu perbaikan oleh pimpinan.

### Tujuan
Memberi pimpinan cara menandai kegiatan yang perlu diperbaiki beserta catatannya.
### Selesai bila
- Pimpinan dapat menandai kegiatan "perlu perbaikan" langsung dari halaman pantau atau detail kegiatan.
- Perubahan status langsung terlihat pada daftar dan ringkasan angka tanpa perlu memuat ulang halaman secara manual.
- Saat menandai "perlu perbaikan", pimpinan wajib menuliskan catatan perbaikan yang tersimpan pada kegiatan tersebut.

## Task

### 1. Bangun halaman Pantau Pimpinan dengan ringkasan status

### 2. Tampilkan daftar kegiatan terbaru seluruh pegawai

### 3. Tambah penyaring pegawai dan bidang pada pantau

### 4. Tambah aksi tandai perlu perbaikan

### 5. Siapkan skema status kegiatan dan catatan pemeriksaan

### 6. Buat endpoint ringkasan dan daftar kegiatan pantau

### 7. Buat endpoint ubah status dan simpan catatan perbaikan

### 8. Terapkan guard peran pimpinan dan admin pada pantau
