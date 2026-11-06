import type { StatusPelaksanaan } from "./umum.types";

export type FormatEkspor = "pdf";

// Satu baris kegiatan di berkas ekspor
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

// Keterangan laporan: periode, filter berlabel, pembuat, dan waktu dibuat
export type InfoEkspor = { periode: string; cakupan: { label: string; nilai: string }[]; dibuatOleh: string; dibuatPada: Date };
