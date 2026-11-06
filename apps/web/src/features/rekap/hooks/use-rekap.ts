"use client";

import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import type { NilaiFilter } from "@/components/shared/filter-bar";
import { getRekap, unduhEkspor } from "../api/rekap";
import type { FormatEkspor, SatuanRekap } from "../types";

// Hook TanStack Query untuk data rekap dan ekspor

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

