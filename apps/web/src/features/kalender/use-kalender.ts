"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { kegiatanKeys } from "@/features/kegiatan/hooks/use-kegiatan";
import { getKalender } from "./api";

// Hook kalender bulanan; data lama ditahan agar tidak berkedip saat ganti bulan

export function useKalender(bulan: string | null) {
  return useQuery({
    queryKey: [...kegiatanKeys.all, "kalender", bulan ?? "sekarang"],
    queryFn: () => getKalender(bulan),
    placeholderData: keepPreviousData,
  });
}
