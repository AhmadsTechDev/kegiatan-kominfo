# Cetak & Unduh Laporan

Laporan kegiatan siap diunduh atau dicetak dalam hitungan menit.

## Spesifikasi

### Tujuan
Memungkinkan pengguna mengubah data kegiatan yang sudah tercatat menjadi laporan siap kirim atau siap olah, tanpa mengolah ulang secara manual.

### Selesai bila
- Pengguna dapat menentukan sendiri periode dan cakupan kegiatan yang ingin dilaporkan, lalu melihat hasilnya sebelum diunduh atau dicetak.
- Laporan tersedia dalam satu format unduhan (PDF siap kirim) dan bisa dicetak langsung dari aplikasi.
- Susunan laporan yang tampil di pratinjau sama persis dengan hasil unduhan maupun cetak.
- Pengguna mendapat konfirmasi jelas saat laporan berhasil dibuat, diunduh, atau dikirim ke pencetakan.

## Sub-fitur: Pilih Rentang Laporan

Tentukan periode dan cakupan kegiatan yang ingin dilaporkan.

### Tujuan
Memberi pengguna kendali untuk menentukan kegiatan mana saja yang masuk ke laporan melalui periode dan cakupan yang dipilih.

### Selesai bila
- Pengguna dapat memilih tanggal awal dan tanggal akhir laporan, dengan pilihan cepat seperti hari ini, bulan ini, atau tahun ini.
- Pengguna dapat mempersempit cakupan laporan berdasarkan bidang kerja dan/atau pegawai, serta boleh mengosongkannya untuk mencakup semua kegiatan.
- Tampilan langsung menunjukkan perkiraan jumlah kegiatan yang akan masuk laporan setiap kali pilihan diubah.

## Sub-fitur: Pratinjau Laporan

Periksa susunan laporan sebelum dicetak atau diunduh.

### Tujuan
Memastikan pengguna sudah melihat susunan dan isi laporan dengan benar sebelum benar-benar mengunduh atau mencetaknya.

### Selesai bila
- Pratinjau menampilkan judul laporan, keterangan periode dan cakupan, serta daftar kegiatan lengkap dengan kolom waktu, lokasi, kategori, dan bidang.
- Pratinjau tersusun rapi per halaman seperti hasil cetak, dengan nomor halaman yang terlihat.
- Bila tidak ada kegiatan pada pilihan tersebut, pratinjau menampilkan pesan kosong yang jelas dan bukan halaman kosong.

## Sub-fitur: Unduh PDF

Simpan laporan dalam format siap kirim atau siap olah.

### Tujuan
Menyediakan laporan dalam bentuk berkas yang bisa langsung dikirim ke pihak lain atau diolah kembali.

### Selesai bila
- Tersedia tombol unduh PDF yang menghasilkan berkas sesuai pilihan periode dan cakupan pada pratinjau.
- Berkas yang diunduh memiliki nama file yang menyebutkan jenis dan periode laporan agar mudah dikenali.
- Format angka dan tanggal pada berkas konsisten dengan yang tampil di pratinjau, dan pengguna melihat indikator proses saat unduhan berlangsung.

## Sub-fitur: Cetak Langsung

Cetak laporan langsung dari aplikasi tanpa pengaturan tambahan.

### Tujuan
Memungkinkan pengguna mencetak laporan langsung dari aplikasi tanpa mengatur ulang ukuran kertas atau tata letak.

### Selesai bila
- Tombol cetak membuka dialog cetak perangkat dan hanya menampilkan isi laporan, tanpa menu, tombol, atau elemen aplikasi lain.
- Hasil cetak mengikuti tata letak pratinjau, termasuk judul, periode, tabel kegiatan, dan nomor halaman.
- Setelah dialog cetak ditutup, pengguna kembali ke halaman pratinjau tanpa kehilangan pilihan periode dan cakupan.

## Task

### 1. Bangun halaman utama laporan dengan data tiruan

### 2. Buat panel pilih periode dan cakupan laporan

### 3. Tampilkan estimasi jumlah kegiatan terpilih

### 4. Buat komponen pratinjau laporan berhalaman

### 5. Buat tombol unduh PDF dengan indikator proses

### 6. Buat tombol cetak langsung dengan gaya khusus cetak

### 7. Tampilkan notifikasi konfirmasi aksi laporan

### 8. Buat endpoint daftar kegiatan untuk laporan

### 9. Buat endpoint estimasi jumlah kegiatan laporan

### 10. Buat layanan pembuatan berkas PDF laporan


### 12. Buat endpoint unduh berkas laporan PDF
