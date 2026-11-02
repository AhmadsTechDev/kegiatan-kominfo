-- Autentikasi dan manajemen akun:
-- 1. Login hanya dengan email. NIP cukup disimpan di pegawai.nip, jadi kolom username (salinan NIP) dihapus.
-- 2. Email baru yang menunggu verifikasi disimpan di user.email_baru.
-- 3. Token aktivasi lama (teks asli) diubah menjadi hash SHA-256 agar tautan undangan yang belum dipakai tetap berlaku.
-- 4. Tabel preferensi_pengguna untuk tema dan notifikasi.

-- NIP pada akun yang tidak tertaut pegawai hanya ada di kolom username; salin ke audit log sebelum kolomnya dihapus
INSERT INTO "audit_log" ("aktor_id", "aksi", "entitas", "entitas_id", "data_sebelum")
SELECT NULL, 'migrasi', 'user', "id", jsonb_build_object('nip', "username", 'keterangan', 'Login NIP dihapus; tautkan akun ke data pegawai')
FROM "user"
WHERE "username" IS NOT NULL AND "pegawai_id" IS NULL;

ALTER TABLE "user" DROP CONSTRAINT "user_username_unique";
ALTER TABLE "user" DROP COLUMN "username";
ALTER TABLE "user" DROP COLUMN "display_username";
ALTER TABLE "user" ADD COLUMN "email_baru" varchar(255);

-- "reset-password:<token>" (15 karakter awalan) menjadi "aktivasi:<sha256 hex token>"
UPDATE "verification"
SET "identifier" = 'aktivasi:' || encode(sha256(convert_to(substring("identifier" FROM 16), 'UTF8')), 'hex')
WHERE "identifier" LIKE 'reset-password:%';

CREATE TABLE "preferensi_pengguna" (
	"user_id" varchar(36) PRIMARY KEY NOT NULL,
	"tema" varchar(10) DEFAULT 'system' NOT NULL,
	"notif_pengingat_kegiatan" boolean DEFAULT true NOT NULL,
	"notif_pengingat_dokumentasi" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "preferensi_pengguna_tema_check" CHECK ("tema" IN ('light', 'dark', 'system')),
	CONSTRAINT "preferensi_pengguna_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);
