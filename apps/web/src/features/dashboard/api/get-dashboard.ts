import { apiClient } from "@/lib/api-client";
import type { DashboardData, KegiatanSaya } from "../types";

// Pemanggil endpoint dashboard (statistik dinas dan kegiatan pegawai)

export async function getDashboard(periode: string | null) {
  const { data } = await apiClient.get<DashboardData>("/dashboard", {
    params: periode ? { periode } : undefined,
  });
  return data;
}

export async function getKegiatanSaya() {
  const { data } = await apiClient.get<KegiatanSaya>("/dashboard/saya");
  return data;
}
