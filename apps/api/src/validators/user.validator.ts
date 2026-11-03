import { t } from "elysia";
import { ROLES, STATUS_AKUN } from "@/utils/konstanta";

const role = t.UnionEnum(ROLES, { error: "Role tidak valid" });
// Untuk filter query sengaja memakai t.Union: t.Optional(t.UnionEnum) di query diisi otomatis nilai pertama ("PEGAWAI")
const roleFilter = t.Union(
  ROLES.map((r) => t.Literal(r)),
  { error: "Role tidak valid" },
);
const statusFilter = t.Union(
  STATUS_AKUN.map((s) => t.Literal(s)),
  { error: "Status akun tidak valid" },
);

// Isian form Buat/Ubah akun. Akun selalu tertaut ke data pegawai: bidang wajib, NIP opsional.
// pegawaiId diisi bila admin memilih pegawai yang sudah terdaftar di Master data
const isiAkun = {
  name: t.String({ minLength: 1, maxLength: 150, error: "Nama wajib diisi, maksimal 150 karakter" }),
  email: t.String({ format: "email", maxLength: 255, error: "Email tidak valid" }),
  nip: t.Optional(t.Nullable(t.String({ pattern: "^(\\d{18})?$", error: "NIP harus 18 digit angka" }))),
  bidangId: t.Integer({ minimum: 1, error: "Bidang wajib dipilih" }),
  role,
  pegawaiId: t.Optional(t.Nullable(t.Integer({ minimum: 1, error: "Pegawai tidak valid" }))),
};

// Aturan isian untuk manajemen akun pengguna (/admin/akun)
export const UserValidator = {
  params: t.Object({ id: t.String({ minLength: 1, maxLength: 36, error: "ID akun tidak valid" }) }),

  daftarQuery: t.Object({
    q: t.Optional(t.String({ maxLength: 100, error: "Kata kunci maksimal 100 karakter" })),
    role: t.Optional(roleFilter),
    status: t.Optional(statusFilter),
    nonaktif: t.Optional(t.Union([t.Literal("1"), t.Literal("0")], { error: "Filter nonaktif tidak valid" })),
    page: t.Optional(t.Numeric({ minimum: 1, default: 1, error: "Halaman tidak valid" })),
    pageSize: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20, error: "Ukuran halaman 1 sampai 100" })),
  }),

  buat: t.Object(isiAkun),
  ubah: t.Object(isiAkun),
  nonaktifkan: t.Object({ alasan: t.Optional(t.String({ maxLength: 255, error: "Alasan maksimal 255 karakter" })) }),
};
