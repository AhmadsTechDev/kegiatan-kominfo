"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getDashboard, getKegiatanSaya } from "../api/get-dashboard";

/**
 * Hook TanStack Query untuk statistik dinas dan tugas pegawai
 */

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

