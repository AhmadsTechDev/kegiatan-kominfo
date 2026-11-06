import type { StatusPelaksanaan } from "@/components/shared/status-badge";

// Tipe data kalender dan respons GET /kalender

export type KegiatanKalender = {
  id: number;
  judul: string;
  tglMulai: string;
  tglSelesai: string;
  lokasiNama: string | null;
  bidang: { id: number; nama: string };
  unitIndukId: number;
  jenis: string;
  penanggungJawab: string;
  statusPelaksanaan: StatusPelaksanaan;
};

export type DataKalender = {
  bulan: string;
  bulanSekarang: string;
  unitInduk: { id: number; nama: string }[];
  items: KegiatanKalender[];
  terpotong: boolean;
};
