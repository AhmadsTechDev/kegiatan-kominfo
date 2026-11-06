"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { bacaNotifikasi, bacaSemuaNotifikasi, getNotifikasi } from "../api/notifikasi";

/**
 * Hook daftar notifikasi (disegarkan berkala) dan tandai dibaca
 */

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
