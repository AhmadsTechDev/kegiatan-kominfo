-- Role bawaan untuk pegawai yang belum punya akun.
-- Role sebenarnya tetap disimpan di akun (user.role); kolom ini hanya menyimpan pilihan admin
-- sebelum pegawai diundang, dan dipakai sebagai role bawaan di dialog Undang.
-- Semua pegawai yang sudah ada mendapat nilai PEGAWAI, jadi perilaku lama tidak berubah.

ALTER TABLE "pegawai" ADD COLUMN "role_undangan" VARCHAR(20) NOT NULL DEFAULT 'PEGAWAI';
ALTER TABLE "pegawai" ADD CONSTRAINT "pegawai_role_undangan_check" CHECK ("role_undangan" IN ('PEGAWAI', 'PIMPINAN'));
