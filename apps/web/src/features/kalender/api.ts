// =============================================================================
// API PENGAMBILAN DATA KALENDER
// =============================================================================
// Gunanya: Mengirim permintaan HTTP GET ke endpoint backend untuk mengambil
// data jadwal kegiatan dinas bulanan dalam Aplikasi Pendataan Kegiatan.
//
// Isi berkas:
//   - getKalender : Mengambil data kegiatan kalender via GET /kalender.
//
// Dipakai oleh: features/kalender/use-kalender.ts
// =============================================================================

import { apiClient } from "@/lib/api-client";
import type { DataKalender } from "./types";

export async function getKalender(bulan: string | null) {
  const { data } = await apiClient.get<DataKalender>("/kalender", { params: bulan ? { bulan } : undefined });
  return data;
}
