import { t } from "elysia";
import { ROLES } from "@/utils/konstanta";

const aktif = { aktif: t.Optional(t.Boolean({ error: "Status aktif tidak valid" })) };

const bidang = {
  kode: t.Optional(t.String({ maxLength: 30, pattern: "^[A-Za-z0-9-]*$", error: "Kode maksimal 30 karakter: huruf, angka, atau tanda hubung" })),
  nama: t.String({ minLength: 1, maxLength: 150, error: "Nama unit wajib diisi, maksimal 150 karakter" }),
  parentId: t.Nullable(t.Integer({ minimum: 1, error: "Bidang induk tidak valid" })),
};

const pegawai = {
  nip: t.Optional(t.Nullable(t.String({ pattern: "^\\d{18}$", error: "NIP harus 18 digit angka" }))),
  nama: t.String({ minLength: 1, maxLength: 150, error: "Nama wajib diisi, maksimal 150 karakter" }),
  jabatan: t.Optional(t.Nullable(t.String({ maxLength: 150, error: "Jabatan maksimal 150 karakter" }))),
  bidangId: t.Integer({ minimum: 1, error: "Bidang wajib dipilih" }),
};

const jenisKegiatan = {
  nama: t.String({ minLength: 1, maxLength: 100, error: "Nama jenis wajib diisi, maksimal 100 karakter" }),
};

export const MasterValidator = {
  params: t.Object({ id: t.Numeric({ minimum: 1, error: "ID tidak valid" }) }),

  buatUnit: t.Object(bidang),
  ubahUnit: t.Object({ ...bidang, ...aktif }),

  daftarPegawaiQuery: t.Object({
    q: t.Optional(t.String({ maxLength: 100, error: "Kata kunci maksimal 100 karakter" })),
    unit: t.Optional(t.Numeric({ minimum: 1, error: "Bidang tidak valid" })),
    aktif: t.Optional(t.Union([t.Literal("1"), t.Literal("0")], { error: "Filter aktif tidak valid" })),
    akun: t.Optional(t.Union([t.Literal("tanpa"), t.Literal("ada")], { error: "Filter akun tidak valid" })),
    page: t.Optional(t.Numeric({ minimum: 1, default: 1, error: "Halaman tidak valid" })),
    pageSize: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20, error: "Ukuran halaman 1 sampai 100" })),
  }),
  buatPegawai: t.Object({
    ...pegawai,
    email: t.Optional(t.Nullable(t.String({ format: "email", maxLength: 255, error: "Email tidak valid" }))),
    role: t.Optional(t.Union([t.Literal("PEGAWAI"), t.Literal("PIMPINAN")], { error: "Role tidak valid" })),
  }),
  ubahPegawai: t.Object({
    ...pegawai,
    ...aktif,
    // Role bawaan saat diundang; tidak berpengaruh bila pegawai sudah punya akun
    // Union literal, bukan UnionEnum: UnionEnum opsional terisi nilai pertama (PEGAWAI) bila field tidak dikirim
    roleUndangan: t.Optional(t.Union(ROLES.map((r) => t.Literal(r)), { error: "Role tidak valid" })),
    // Nomor telepon disimpan di akun; hanya bisa diisi bila pegawai sudah punya akun
    kontak: t.Optional(t.Nullable(t.String({ maxLength: 50, pattern: "^[0-9+()\\-\\s]*$", error: "Nomor telepon hanya angka, spasi, +, -, atau tanda kurung, maksimal 50 karakter" }))),
  }),

  buatJenis: t.Object(jenisKegiatan),
  ubahJenis: t.Object({ ...jenisKegiatan, ...aktif }),
};
