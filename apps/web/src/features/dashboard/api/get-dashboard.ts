// =============================================================================
// API PENGAMBILAN DATA DASHBOARD
// =============================================================================
// Gunanya: Mengirim permintaan HTTP GET ke endpoint backend untuk mengambil
// data ringkasan statistik dinas dan data kegiatan pribadi milik pegawai.
//
// Isi berkas:
//   - getDashboard : Mengambil data dashboard dinas via GET /dashboard.
//   - getKegiatanSaya : Mengambil data dashboard pegawai via GET /dashboard/saya.
//
// Dipakai oleh: features/dashboard/hooks/use-dashboard.ts
// =============================================================================

import { apiClient } from "@/lib/api-client";
import type { DashboardData, KegiatanSaya } from "../types";

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
