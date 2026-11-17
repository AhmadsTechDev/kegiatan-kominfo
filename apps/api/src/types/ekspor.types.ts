import type { StatusPelaksanaan } from "./umum.types";

export type FormatEkspor = "pdf";

export type BarisEkspor = {
  id: number;
  judul: string;
  jenis: string;
  bidang: string;
  bidangId: number;
  penanggungJawab: string;
  tglMulai: Date;
  tglSelesai: Date;
  lokasiNama: string | null;
  lat: number | null;
  lng: number | null;
  jumlahPeserta: number | null;
  uraian: string | null;
  hasil: string | null;
  alasanBatal: string | null;
  refEksternal: string | null;
  statusPelaksanaan: StatusPelaksanaan;
};

export type InfoEkspor = { periode: string; dibuatOleh: string; dibuatPada: Date };
