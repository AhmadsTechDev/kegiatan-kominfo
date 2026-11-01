// =============================================================================
// FUNGSI PEMANGGIL API LAPORAN
// =============================================================================
// Gunanya: Mengambil pratinjau cetak laporan dan perkiraan jumlah kegiatan.
//
// Isi berkas:
//   - paramsCakupan : menyaring parameter cakupan yang terisi saja
//   - getPratinjau  : memanggil endpoint GET /ekspor/pratinjau
//   - getEstimasi   : memanggil endpoint GET /kegiatan untuk total kegiatan
//
// Dipakai oleh: frontend/src/features/laporan/components/laporan-view.tsx
// =============================================================================

import { apiClient } from "@/lib/api-client";
import type { CakupanLaporan, PratinjauLaporan } from "./types";

export const paramsCakupan = (c: CakupanLaporan) => Object.fromEntries(Object.entries(c).filter(([, v]) => v));

export async function getPratinjau(cakupan: CakupanLaporan) {
  const { data } = await apiClient.get<PratinjauLaporan>("/ekspor/pratinjau", { params: paramsCakupan(cakupan) });
  return data;
}

export async function getEstimasi(cakupan: CakupanLaporan) {
  const { data } = await apiClient.get<{ total: number }>("/kegiatan", { params: { ...paramsCakupan(cakupan), pageSize: 1 } });
  return data.total;
}
