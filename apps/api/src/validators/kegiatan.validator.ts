import { t } from "elysia";
import { STATUS_PELAKSANAAN, STATUS_PEMERIKSAAN } from "@/utils/konstanta";

// ID angka >= 1 dengan pesan galat sendiri
const id = (pesan: string) => t.Integer({ minimum: 1, error: pesan });

// Teks opsional (boleh null) dengan panjang maksimal
const teksOpsional = (maks: number, pesan: string) => t.Optional(t.Nullable(t.String({ maxLength: maks, error: pesan })));

// Waktu ISO 8601, contoh "2026-05-05T09:00:00+07:00"
const waktu = (pesan: string) => t.String({ format: "date-time", error: pesan });

// Tanggal opsional berformat YYYY-MM-DD
const tanggal = (pesan: string) => t.Optional(t.String({ pattern: "^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$", error: pesan }));

const isiKegiatan = {
  judul: t.String({ minLength: 1, maxLength: 200, error: "Judul wajib diisi, maksimal 200 karakter" }),
  jenisId: id("Jenis kegiatan wajib dipilih"),
  uraian: teksOpsional(5000, "Uraian maksimal 5.000 karakter"),
  penanggungJawabId: id("Penanggung jawab wajib dipilih"),
  jumlahPeserta: t.Optional(t.Nullable(t.Integer({ minimum: 0, maximum: 100000, error: "Jumlah peserta tidak valid" }))),
  hasil: teksOpsional(5000, "Hasil maksimal 5.000 karakter"),
  tglMulai: waktu("Tanggal mulai wajib diisi"),
  tglSelesai: waktu("Tanggal selesai wajib diisi"),
  lokasiNama: teksOpsional(255, "Nama lokasi maksimal 255 karakter"),
  lat: t.Optional(t.Nullable(t.Number({ minimum: -90, maximum: 90, error: "Lintang harus di antara -90 dan 90" }))),
  lng: t.Optional(t.Nullable(t.Number({ minimum: -180, maximum: 180, error: "Bujur harus di antara -180 dan 180" }))),
  refEksternal: teksOpsional(255, "Nomor referensi maksimal 255 karakter"),
};

const versi = { expectedUpdatedAt: waktu("Versi data (expectedUpdatedAt) wajib dikirim") };

export const KegiatanValidator = {
  params: t.Object({ id: t.Numeric({ minimum: 1, error: "ID kegiatan tidak valid" }) }),

  daftarQuery: t.Object({
    unit: t.Optional(t.Numeric({ minimum: 1, error: "Bidang tidak valid" })),
    jenis: t.Optional(t.Numeric({ minimum: 1, error: "Jenis kegiatan tidak valid" })),
    status: t.Optional(t.Union(STATUS_PELAKSANAAN.map((s) => t.Literal(s)), { error: "Status tidak valid" })),
    periode: t.Optional(t.String({ pattern: "^\\d{4}-(0[1-9]|1[0-2])$", error: "Periode harus berformat YYYY-MM" })),
    dari: tanggal("Tanggal awal harus berformat YYYY-MM-DD"),
    sampai: tanggal("Tanggal akhir harus berformat YYYY-MM-DD"),
    pegawai: t.Optional(t.Numeric({ minimum: 1, error: "Pegawai tidak valid" })),
    pemeriksaan: t.Optional(t.Union(STATUS_PEMERIKSAAN.map((s) => t.Literal(s)), { error: "Status pemeriksaan tidak valid" })),
    q: t.Optional(t.String({ maxLength: 100, error: "Kata kunci maksimal 100 karakter" })),
    milik: t.Optional(t.Literal("saya", { error: "Filter milik tidak valid" })),
    page: t.Optional(t.Numeric({ minimum: 1, default: 1, error: "Halaman tidak valid" })),
    pageSize: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20, error: "Ukuran halaman 1 sampai 100" })),
  }),

  buat: t.Object({ ...isiKegiatan, drafId: t.Optional(id("Draf tidak valid")) }),
  ubah: t.Object({ ...isiKegiatan, ...versi }),
  selesai: t.Object({ ...versi }),
  periksa: t.Object({
    status: t.Union([t.Literal("diperiksa"), t.Literal("perlu_perbaikan")], { error: "Status harus diperiksa atau perlu_perbaikan" }),
    catatan: t.Optional(t.Nullable(t.String({ maxLength: 2000, error: "Catatan maksimal 2.000 karakter" }))),
  }),
  batalkan: t.Object({
    alasan: t.String({ minLength: 1, maxLength: 1000, error: "Alasan pembatalan wajib diisi" }),
    ...versi,
  }),
};
