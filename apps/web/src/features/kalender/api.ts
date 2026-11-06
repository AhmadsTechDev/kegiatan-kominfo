import { apiClient } from "@/lib/api-client";
import type { DataKalender } from "./types";

/**
 * Pemanggil endpoint kalender (jadwal kegiatan bulanan)
 */

export async function getKalender(bulan: string | null) {
  const { data } = await apiClient.get<DataKalender>("/kalender", { params: bulan ? { bulan } : undefined });
  return data;
}
