# Rekap Otomatis

Jumlah dan sebaran kegiatan terhitung sendiri tanpa perlu diolah manual.

## Spesifikasi

### Tujuan
Memberi pengguna gambaran jumlah dan sebaran kegiatan yang terhitung sendiri oleh aplikasi, sehingga tidak perlu lagi merekap manual di Excel.

### Selesai bila
- Tersedia satu halaman Rekap yang menampilkan jumlah kegiatan tanpa pengguna menghitung sendiri.
- Angka rekap selalu mengikuti data terkini: kegiatan yang baru dicatat, diubah, atau dihapus langsung tercermin saat halaman dibuka ulang.
- Pengguna dapat memilih cakupan rekap — per hari, per bulan, per tahun, per bidang, dan per pegawai — dari halaman yang sama.
- Setiap angka selalu disertai keterangan periode dan cakupannya, sehingga tidak salah tafsir.
- Halaman rekap tetap terbuka dengan wajar ketika jumlah kegiatan sudah banyak.

## Sub-fitur: Rekap per Periode

Lihat jumlah kegiatan harian, bulanan, atau per tahun.

### Tujuan
Memungkinkan pengguna melihat berapa banyak kegiatan pada rentang waktu harian, bulanan, atau tahunan tanpa menghitung manual.

### Selesai bila
- Pengguna dapat memilih tampilan rekap harian, bulanan, atau tahunan, lalu menentukan periode yang ingin dilihat.
- Jumlah kegiatan tampil sebagai daftar angka yang menyebutkan periodenya dengan jelas (contoh: "Januari 2025 — 12 kegiatan").
- Periode yang tidak memiliki kegiatan tetap ditampilkan dengan angka 0 agar tidak dikira datanya hilang.

## Sub-fitur: Rekap per Bidang

Bandingkan banyaknya kegiatan antar bidang atau pegawai.

### Tujuan
Memungkinkan pengguna membandingkan banyaknya kegiatan antar bidang kerja maupun antar pegawai dalam satu tampilan.

### Selesai bila
- Setiap bidang tampil bersama jumlah kegiatannya, terurut dari yang paling banyak.
- Pengguna dapat beralih melihat rekap per pegawai, bukan hanya per bidang.
- Total dari seluruh baris daftar sama persis dengan total kegiatan pada periode yang sedang dilihat.

## Sub-fitur: Ringkasan Angka

Tampilkan total kegiatan dalam angka ringkas yang mudah dibaca.

### Tujuan
Menampilkan inti rekap dalam beberapa angka besar yang ringkas agar kondisi kegiatan bisa dipahami dalam sekali lihat.

### Selesai bila
- Beberapa kartu angka ringkas tampil di bagian atas halaman rekap (contoh: total kegiatan, jumlah bidang terlibat, kegiatan bulan ini).
- Setiap angka memakai format ribuan yang mudah dibaca (contoh: 1.250) dan diberi label singkat yang jelas.
- Angka ringkas selalu cocok dengan rincian yang tampil di bawahnya pada periode yang sama.

## Sub-fitur: Grafik Sederhana

Sajikan tren kegiatan dalam bentuk grafik yang cepat dipahami.

### Tujuan
Menyajikan tren kegiatan dalam bentuk grafik sederhana agar naik-turunnya kegiatan cepat dipahami tanpa membaca tabel.

### Selesai bila
- Sebuah grafik menampilkan tren jumlah kegiatan sepanjang periode yang dipilih.
- Setiap bagian grafik dapat ditunjuk untuk melihat angka dan label periodenya.
- Saat belum ada data, grafik diganti pesan yang jelas (contoh: "Belum ada kegiatan pada periode ini"), bukan grafik kosong tanpa keterangan.

## Task

### 1. Bangun halaman Rekap dengan data tiruan

### 2. Buat pemilih mode dan periode rekap

### 3. Tampilkan daftar jumlah kegiatan per periode

### 4. Buat kartu ringkasan angka rekap

### 5. Buat daftar peringkat bidang dan pegawai

### 6. Buat grafik tren kegiatan sederhana

### 7. Buat service agregasi kegiatan per periode

### 8. Buat endpoint API rekap per periode

### 9. Buat endpoint rekap per bidang dan pegawai

### 10. Buat endpoint ringkasan angka rekap

### 11. Buat endpoint tren grafik kegiatan
