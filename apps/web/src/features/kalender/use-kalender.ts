// =============================================================================
// HOOK KALENDER KEGIATAN
// =============================================================================
// Gunanya: Mengambil data jadwal kegiatan bulanan menggunakan TanStack Query
// dengan penahanan cache agar navigasi antar-bulan tidak berkedip.
//
// Isi berkas:
//   - useKalender : Hook kueri kalender bulanan (terikat cache mutasi kegiatan).
//
// Dipakai oleh: features/kalender/components/kalender-view.tsx
// =============================================================================

"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { kegiatanKeys } from "@/features/kegiatan/hooks/use-kegiatan";
import { getKalender } from "./api";

export function useKalender(bulan: string | null) {
  return useQuery({
    queryKey: [...kegiatanKeys.all, "kalender", bulan ?? "sekarang"],
    queryFn: () => getKalender(bulan),
    placeholderData: keepPreviousData,
  });
}
