import type { StatusPelaksanaan } from "./umum.types";

export type FormatEkspor = "xlsx" | "pdf";

// Satu baris kegiatan di berkas ekspor
export type BarisEkspor = {
  id: number;
  judul: string;
  jenis: string;
  unitKerja: string;
  unitKerjaId: number;
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

// Keterangan laporan: uraian filter, pembuat, dan waktu dibuat
export type InfoEkspor = { filter: string[]; dibuatOleh: string; dibuatPada: Date };
