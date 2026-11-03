-- Admin juga boleh diundang, jadi role bawaan undangan boleh ADMIN.

ALTER TABLE "pegawai" DROP CONSTRAINT "pegawai_role_undangan_check";
ALTER TABLE "pegawai" ADD CONSTRAINT "pegawai_role_undangan_check" CHECK ("role_undangan" IN ('PEGAWAI', 'PIMPINAN', 'ADMIN'));
