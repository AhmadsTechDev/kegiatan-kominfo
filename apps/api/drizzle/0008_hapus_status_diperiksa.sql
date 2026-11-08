-- Status pemeriksaan "diperiksa" dihapus; pimpinan hanya menandai kegiatan yang perlu perbaikan.
-- Struktur tabel tidak berubah, hanya data lama yang dirapikan:
-- kegiatan berstatus diperiksa kembali ke keadaan biasa (terkirim), serta riwayat catatan
-- dan notifikasi "sudah diperiksa" dihapus karena tidak lagi ditampilkan. Audit log tidak disentuh.

UPDATE "kegiatan" SET "status_pemeriksaan" = 'terkirim' WHERE "status_pemeriksaan" = 'diperiksa';
DELETE FROM "catatan_pemeriksaan" WHERE "status" = 'diperiksa';
DELETE FROM "notifikasi" WHERE "jenis" = 'diperiksa';
