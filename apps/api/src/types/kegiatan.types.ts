import type { KegiatanValidator } from "@/validators/kegiatan.validator";
import type { Milik, Rentang, StatusPelaksanaan, StatusPemeriksaan } from "./umum.types";

export type DaftarQuery = typeof KegiatanValidator.daftarQuery.static;
export type IsiKegiatan = typeof KegiatanValidator.buat.static;
export type UbahKegiatan = typeof KegiatanValidator.ubah.static;
export type BatalkanKegiatan = typeof KegiatanValidator.batalkan.static;
export type SelesaikanKegiatan = typeof KegiatanValidator.selesai.static;
export type PeriksaKegiatan = typeof KegiatanValidator.periksa.static;

export type QueryFilter = Pick<DaftarQuery, "unit" | "jenis" | "status" | "periode" | "q" | "dari" | "sampai" | "pegawai" | "pemeriksaan">;

export type LingkupBaca = { unitIds: number[]; milik: Milik };

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
