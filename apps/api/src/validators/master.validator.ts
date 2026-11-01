import { t } from "elysia";

const aktif = { aktif: t.Optional(t.Boolean({ error: "Status aktif tidak valid" })) };

const unitKerja = {
  kode: t.Optional(t.String({ maxLength: 30, pattern: "^[A-Za-z0-9-]*$", error: "Kode maksimal 30 karakter: huruf, angka, atau tanda hubung" })),
  nama: t.String({ minLength: 1, maxLength: 150, error: "Nama unit wajib diisi, maksimal 150 karakter" }),
  jenisUnitId: t.Integer({ minimum: 1, error: "Jenis unit wajib dipilih" }),
  parentId: t.Nullable(t.Integer({ minimum: 1, error: "Unit induk tidak valid" })),
};

const jenisUnit = {
  nama: t.String({ minLength: 1, maxLength: 100, error: "Nama jenis unit wajib diisi, maksimal 100 karakter" }),
  indukJenisId: t.Nullable(t.Integer({ minimum: 1, error: "Jenis induk tidak valid" })),
};

const pegawai = {
  nip: t.Optional(t.Nullable(t.String({ pattern: "^\\d{18}$", error: "NIP harus 18 digit angka" }))),
  nama: t.String({ minLength: 1, maxLength: 150, error: "Nama wajib diisi, maksimal 150 karakter" }),
  jabatan: t.Optional(t.Nullable(t.String({ maxLength: 150, error: "Jabatan maksimal 150 karakter" }))),
  unitKerjaId: t.Integer({ minimum: 1, error: "Unit kerja wajib dipilih" }),
};

const jenisKegiatan = {
  nama: t.String({ minLength: 1, maxLength: 100, error: "Nama jenis wajib diisi, maksimal 100 karakter" }),
};

export const MasterValidator = {
  params: t.Object({ id: t.Numeric({ minimum: 1, error: "ID tidak valid" }) }),

  buatUnit: t.Object(unitKerja),
  ubahUnit: t.Object({ ...unitKerja, ...aktif }),

  buatJenisUnit: t.Object(jenisUnit),
  ubahJenisUnit: t.Object({ ...jenisUnit, ...aktif }),

  daftarPegawaiQuery: t.Object({
    q: t.Optional(t.String({ maxLength: 100, error: "Kata kunci maksimal 100 karakter" })),
    unit: t.Optional(t.Numeric({ minimum: 1, error: "Unit kerja tidak valid" })),
    aktif: t.Optional(t.Union([t.Literal("1"), t.Literal("0")], { error: "Filter aktif tidak valid" })),
    page: t.Optional(t.Numeric({ minimum: 1, default: 1, error: "Halaman tidak valid" })),
    pageSize: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20, error: "Ukuran halaman 1 sampai 100" })),
  }),
  buatPegawai: t.Object({
    ...pegawai,
    email: t.Optional(t.Nullable(t.String({ format: "email", maxLength: 255, error: "Email tidak valid" }))),
    role: t.Optional(t.Union([t.Literal("PEGAWAI"), t.Literal("PIMPINAN")], { error: "Role tidak valid" })),
  }),
  imporPegawai: t.Object({
    berkas: t.File({ error: "Pilih berkas Excel (.xlsx)" }),
    simpan: t.Optional(t.String({ maxLength: 1 })),
  }),
  ubahPegawai: t.Object({ ...pegawai, ...aktif }),

  buatJenis: t.Object(jenisKegiatan),
  ubahJenis: t.Object({ ...jenisKegiatan, ...aktif }),
};
