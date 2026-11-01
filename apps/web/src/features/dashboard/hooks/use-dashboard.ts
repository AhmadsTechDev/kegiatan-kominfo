// =============================================================================
// HOOK DATA DASHBOARD
// =============================================================================
// Gunanya: Memuat data statistik dinas dan tugas pegawai via TanStack Query.
//
// Isi berkas:
//   - dashboardKeys : Manajemen kunci cache query TanStack Query.
//   - useDashboard : Hook data dinas dengan proteksi kedipan (keepPreviousData).
//   - useKegiatanSaya : Hook data agenda dan tugas dokumentasi personal pegawai.
//
// Dipakai oleh: dashboard-view.tsx, dashboard-pegawai.tsx, kegiatan-saya.tsx
// =============================================================================

"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getDashboard, getKegiatanSaya } from "../api/get-dashboard";

export const dashboardKeys = {
  all: ["dashboard"] as const,
  periode: (periode: string | null) => [...dashboardKeys.all, periode ?? "sekarang"] as const,
  saya: ["dashboard", "saya"] as const,
};

export function useDashboard(periode: string | null) {
  return useQuery({
    queryKey: dashboardKeys.periode(periode),
    queryFn: () => getDashboard(periode),
    placeholderData: keepPreviousData,
  });
}

export function useKegiatanSaya() {
  return useQuery({ queryKey: dashboardKeys.saya, queryFn: getKegiatanSaya });
}

