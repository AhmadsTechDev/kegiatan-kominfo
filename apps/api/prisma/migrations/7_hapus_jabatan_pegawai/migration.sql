-- Kolom jabatan dihapus dari data pegawai (tidak dipakai lagi di aplikasi).
-- Data jabatan yang sudah tersimpan ikut terhapus.

ALTER TABLE "pegawai" DROP COLUMN "jabatan";
