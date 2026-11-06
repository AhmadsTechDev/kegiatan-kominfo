import type { KegiatanValidator } from "@/validators/kegiatan.validator";
import type { Milik, Rentang, StatusPelaksanaan, StatusPemeriksaan } from "./umum.types";

export type DaftarQuery = typeof KegiatanValidator.daftarQuery.static;
export type IsiKegiatan = typeof KegiatanValidator.buat.static;
export type UbahKegiatan = typeof KegiatanValidator.ubah.static;
export type BatalkanKegiatan = typeof KegiatanValidator.batalkan.static;
export type SelesaikanKegiatan = typeof KegiatanValidator.selesai.static;
export type PeriksaKegiatan = typeof KegiatanValidator.periksa.static;

/**
 * Bagian query yang dipakai bersama oleh daftar kegiatan, rekap, pantau, dan ekspor
 */
export type QueryFilter = Pick<DaftarQuery, "unit" | "jenis" | "status" | "periode" | "q" | "dari" | "sampai" | "pegawai" | "pemeriksaan">;

/**
 * Kegiatan yang boleh dilihat PEGAWAI: bidangnya (beserta turunan) dan kegiatan miliknya
 */
export type LingkupBaca = { unitIds: number[]; milik: Milik };

/**
 * Filter yang sudah diolah service, siap diubah menjadi `where` Prisma oleh repository
 */
export type FilterDaftar = {
  unitIds?: number[];
  jenisId?: number;
  pegawaiId?: number;
  status?: StatusPelaksanaan;
  pemeriksaan?: StatusPemeriksaan;
  rentang?: Rentang;
  q?: string;
  milik?: Milik;
  lingkup?: LingkupBaca;
};

/**
 * Nilai kolom kegiatan yang ditulis ke basis data saat buat/ubah
 */
export type NilaiKegiatan = {
  judul: string;
  jenisId: number;
  uraian: string | null;
  penanggungJawabId: number;
  bidangId: number;
  jumlahPeserta: number | null;
  hasil: string | null;
  tglMulai: Date;
  tglSelesai: Date;
  lokasiNama: string | null;
  lat: string | null;
  lng: string | null;
  refEksternal: string | null;
};
