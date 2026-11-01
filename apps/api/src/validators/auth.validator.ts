import { t } from "elysia";

export const AuthValidator = {
  ubahProfil: t.Object({
    nama: t.String({ minLength: 1, maxLength: 150, error: "Nama wajib diisi, maksimal 150 karakter" }),
    jabatan: t.Optional(t.Nullable(t.String({ maxLength: 150, error: "Jabatan maksimal 150 karakter" }))),
    kontak: t.Optional(t.Nullable(t.String({ maxLength: 50, pattern: "^[0-9+()\\-\\s]*$", error: "Kontak berupa nomor telepon, maksimal 50 karakter" }))),
  }),
  unggahFoto: t.Object({ berkas: t.File({ error: "Pilih foto untuk diunggah" }) }),
  fotoParams: t.Object({ userId: t.String({ minLength: 1, maxLength: 36 }) }),
};
