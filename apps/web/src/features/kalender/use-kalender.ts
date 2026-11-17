"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { kegiatanKeys } from "@/features/kegiatan/hooks/use-kegiatan";
import { apiClient } from "@/lib/api-client";
import type { DataKalender } from "./types";

async function getKalender(bulan: string | null) {
  const { data } = await apiClient.get<DataKalender>("/kalender", { params: bulan ? { bulan } : undefined });
  return data;
}

export function useKalender(bulan: string | null) {
  return useQuery({
    queryKey: [...kegiatanKeys.all, "kalender", bulan ?? "sekarang"],
    queryFn: () => getKalender(bulan),
    placeholderData: keepPreviousData,
  });
}
