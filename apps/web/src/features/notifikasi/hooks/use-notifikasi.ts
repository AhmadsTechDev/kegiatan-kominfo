// =============================================================================
// HOOK NOTIFIKASI
// =============================================================================
// Gunanya: Kueri daftar notifikasi (disegarkan berkala) dan mutasi tandai dibaca.
//
// Isi berkas:
//   - notifikasiKeys : kunci cache TanStack Query
//   - useNotifikasi  : daftar notifikasi + jumlah belum dibaca, disegarkan tiap 60 detik
//   - useBacaNotifikasi, useBacaSemuaNotifikasi : mutasi tandai dibaca
//
// Dipakai oleh: features/notifikasi/components/lonceng-notifikasi.tsx
// =============================================================================

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { bacaNotifikasi, bacaSemuaNotifikasi, getNotifikasi } from "../api/notifikasi";

export const notifikasiKeys = { all: ["notifikasi"] as const };

export function useNotifikasi(aktif = true) {
  return useQuery({ queryKey: notifikasiKeys.all, queryFn: getNotifikasi, enabled: aktif, refetchInterval: 60_000 });
}

export function useBacaNotifikasi() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: bacaNotifikasi, onSuccess: () => queryClient.invalidateQueries({ queryKey: notifikasiKeys.all }) });
}

export function useBacaSemuaNotifikasi() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: bacaSemuaNotifikasi, onSuccess: () => queryClient.invalidateQueries({ queryKey: notifikasiKeys.all }) });
}
