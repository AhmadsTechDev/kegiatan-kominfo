-- Mengganti nama tabel unit_kerja menjadi bidang (isinya bidang dan sub bidang).
-- Seluruhnya RENAME, bukan hapus lalu buat ulang, sehingga data yang sudah ada tetap utuh.
-- Nilai entitas pada audit_log mengikuti nama tabel, jadi baris lama ikut diganti agar filter dan labelnya tidak terpecah dua.

ALTER TABLE "unit_kerja" RENAME TO "bidang";
ALTER SEQUENCE "unit_kerja_id_seq" RENAME TO "bidang_id_seq";
ALTER TABLE "bidang" RENAME CONSTRAINT "unit_kerja_pkey" TO "bidang_pkey";
ALTER INDEX "unit_kerja_kode_unique" RENAME TO "bidang_kode_unique";
ALTER INDEX "unit_kerja_parent_id_idx" RENAME TO "bidang_parent_id_idx";
ALTER TABLE "bidang" RENAME CONSTRAINT "unit_kerja_parent_id_unit_kerja_id_fk" TO "bidang_parent_id_bidang_id_fk";
ALTER TABLE "bidang" RENAME CONSTRAINT "unit_kerja_jenis_unit_id_jenis_unit_id_fk" TO "bidang_jenis_unit_id_jenis_unit_id_fk";

ALTER TABLE "pegawai" RENAME COLUMN "unit_kerja_id" TO "bidang_id";
ALTER INDEX "pegawai_unit_kerja_id_idx" RENAME TO "pegawai_bidang_id_idx";
ALTER TABLE "pegawai" RENAME CONSTRAINT "pegawai_unit_kerja_id_unit_kerja_id_fk" TO "pegawai_bidang_id_bidang_id_fk";

ALTER TABLE "kegiatan" RENAME COLUMN "unit_kerja_id" TO "bidang_id";
ALTER INDEX "kegiatan_unit_tgl_mulai_idx" RENAME TO "kegiatan_bidang_tgl_mulai_idx";
ALTER TABLE "kegiatan" RENAME CONSTRAINT "kegiatan_unit_kerja_id_unit_kerja_id_fk" TO "kegiatan_bidang_id_bidang_id_fk";

-- View rekap mengikuti otomatis karena PostgreSQL menyimpannya berdasarkan id objek; hanya kolom keluarannya yang diganti namanya.
ALTER VIEW "v_unit_induk" RENAME COLUMN "unit_kerja_id" TO "bidang_id";

-- Riwayat audit: hanya nilai entitas yang diganti, isi dan waktunya tidak disentuh.
UPDATE "audit_log" SET "entitas" = 'bidang' WHERE "entitas" = 'unit_kerja';
