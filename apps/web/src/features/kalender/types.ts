// =============================================================================
// TIPE DATA FITUR KALENDER
// =============================================================================
// Gunanya: Mendefinisikan kontrak struktur data kegiatan dan respons endpoint
// GET /kalender untuk visualisasi kalender bulanan di aplikasi.
//
// Isi berkas:
//   - KegiatanKalender : Struktur data jadwal kegiatan dinas di kalender.
//   - DataKalender : Struktur data respons API kalender bulanan dari backend.
//
// Dipakai oleh: features/kalender/api.ts dan components/kalender-view.tsx
// =============================================================================

import type { StatusPelaksanaan } from "@/components/shared/status-badge";

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
