// =============================================================================
// HOOK DATA REKAPITULASI DAN EKSPOR
// =============================================================================
// Gunanya: Menyediakan hook TanStack Query untuk data rekap dan ekspor laporan.
//
// Isi berkas:
//   - rekapKeys : kunci cache query rekap untuk pengelolaan invalidasi
//   - useRekap  : mengambil data statistik rekapitulasi (angka lama ditahan)
//   - useEkspor : mutasi pengunduhan berkas laporan rekapitulasi kegiatan
//
// Dipakai oleh: rekap-view.tsx, laporan-view.tsx, dan use-kegiatan.ts
// =============================================================================

"use client";

import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import type { NilaiFilter } from "@/components/shared/filter-bar";
import { getRekap, unduhEkspor } from "../api/rekap";
import type { FormatEkspor, SatuanRekap } from "../types";

export const rekapKeys = {
  all: ["rekap"] as const,
  filter: (filter: NilaiFilter, satuan: SatuanRekap) => [...rekapKeys.all, filter, satuan] as const,
};

export function useRekap(filter: NilaiFilter, satuan: SatuanRekap) {
  return useQuery({
    queryKey: rekapKeys.filter(filter, satuan),
    queryFn: () => getRekap(filter, satuan),
    placeholderData: keepPreviousData,
  });
}

export function useEkspor() {
  return useMutation({
    mutationFn: ({ format, filter }: { format: FormatEkspor; filter: NilaiFilter }) => unduhEkspor(format, filter),
  });
}

