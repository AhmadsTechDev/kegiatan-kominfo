import { apiClient } from "@/lib/api-client";
import type { CakupanLaporan, KegiatanDokumentasi, PratinjauLaporan } from "./types";

// Pemanggil endpoint pratinjau laporan dan perkiraan jumlah kegiatan

export const paramsCakupan = (c: CakupanLaporan) => Object.fromEntries(Object.entries(c).filter(([, v]) => v));

export async function getPratinjau(cakupan: CakupanLaporan) {
  const { data } = await apiClient.get<PratinjauLaporan>("/ekspor/pratinjau", { params: paramsCakupan(cakupan) });
  return data;
}

export async function getDokumentasiLaporan(cakupan: CakupanLaporan) {
  const { data } = await apiClient.get<KegiatanDokumentasi[]>("/ekspor/dokumentasi", { params: paramsCakupan(cakupan) });
  return data;
}

export async function getEstimasi(cakupan: CakupanLaporan) {
  const { data } = await apiClient.get<{ total: number }>("/kegiatan", { params: { ...paramsCakupan(cakupan), pageSize: 1 } });
  return data.total;
}
