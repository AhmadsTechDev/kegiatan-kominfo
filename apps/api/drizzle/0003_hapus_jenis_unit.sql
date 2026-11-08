-- Menyederhanakan struktur bidang: tabel jenis_unit dihapus.
-- Tingkat ditentukan parent_id pada tabel bidang: tanpa induk berarti bidang, dengan induk berarti sub bidang.
-- Daftar bidang dan sub bidang beserta induknya tidak berubah; yang hilang hanya penanda jenis (nama dan tingkatannya).

ALTER TABLE "bidang" DROP CONSTRAINT "bidang_jenis_unit_id_jenis_unit_id_fk";
ALTER TABLE "bidang" DROP COLUMN "jenis_unit_id";
DROP TABLE "jenis_unit";
