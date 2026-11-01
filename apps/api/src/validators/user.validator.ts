import { t } from "elysia";
import { ROLES } from "@/utils/konstanta";

const role = t.UnionEnum(ROLES, { error: "Role tidak valid" });
const sandi = t.String({ minLength: 10, maxLength: 128, error: "Kata sandi minimal 10 karakter" });
const nip = t.Optional(t.Nullable(t.String({ pattern: "^\\d{18}$", error: "NIP harus 18 digit angka" })));

const isiAkun = {
  name: t.String({ minLength: 1, maxLength: 150, error: "Nama wajib diisi, maksimal 150 karakter" }),
  email: t.String({ format: "email", maxLength: 255, error: "Email tidak valid" }),
  nip,
  role,
  pegawaiId: t.Optional(t.Nullable(t.Integer({ minimum: 1, error: "Pegawai tidak valid" }))),
};

// Aturan isian untuk manajemen akun pengguna (/admin/akun)
export const UserValidator = {
  params: t.Object({ id: t.String({ minLength: 1, maxLength: 36, error: "ID akun tidak valid" }) }),

  daftarQuery: t.Object({
    q: t.Optional(t.String({ maxLength: 100, error: "Kata kunci maksimal 100 karakter" })),
    role: t.Optional(role),
    aktif: t.Optional(t.Union([t.Literal("1"), t.Literal("0")], { error: "Filter aktif tidak valid" })),
    page: t.Optional(t.Numeric({ minimum: 1, default: 1, error: "Halaman tidak valid" })),
    pageSize: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20, error: "Ukuran halaman 1 sampai 100" })),
  }),

  buat: t.Object({ ...isiAkun, password: sandi }),
  ubah: t.Object(isiAkun),
  nonaktifkan: t.Object({ alasan: t.Optional(t.String({ maxLength: 255, error: "Alasan maksimal 255 karakter" })) }),
  resetSandi: t.Object({ password: sandi }),
  hubungkan: t.Object({
    pegawaiId: t.Optional(t.Integer({ minimum: 1, error: "Pegawai tidak valid" })),
    pegawaiBaru: t.Optional(
      t.Object({
        nip,
        jabatan: t.Optional(t.Nullable(t.String({ maxLength: 150, error: "Jabatan maksimal 150 karakter" }))),
        unitKerjaId: t.Integer({ minimum: 1, error: "Unit kerja wajib dipilih" }),
      }),
    ),
  }),
};
