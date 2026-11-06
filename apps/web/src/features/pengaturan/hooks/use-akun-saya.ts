"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";
import {
  batalGantiEmail,
  cabutSesi,
  cabutSesiLain,
  gantiEmail,
  gantiSandi,
  getPreferensi,
  getSesi,
  ubahKontak,
  ubahPreferensi,
  type Preferensi,
  type Tema,
} from "../api/akun-saya";

// Hook halaman Pengaturan, termasuk sinkronisasi tema perangkat dengan server

const kunci = {
  profil: ["me"] as const,
  sesi: ["me", "sesi"] as const,
  preferensi: ["me", "preferensi"] as const,
};

function useSegarkanProfil() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: kunci.profil, exact: true });
}

export function useUbahKontak() {
  return useMutation({ mutationFn: ubahKontak, onSuccess: useSegarkanProfil() });
}

export function useGantiEmail() {
  return useMutation({ mutationFn: gantiEmail, onSuccess: useSegarkanProfil() });
}

export function useBatalGantiEmail() {
  return useMutation({ mutationFn: batalGantiEmail, onSuccess: useSegarkanProfil() });
}

export function useGantiSandi() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: gantiSandi, onSuccess: () => queryClient.invalidateQueries({ queryKey: kunci.sesi }) });
}

export const useSesi = () => useQuery({ queryKey: kunci.sesi, queryFn: getSesi });

export function useCabutSesi() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: cabutSesi, onSuccess: () => queryClient.invalidateQueries({ queryKey: kunci.sesi }) });
}

export function useCabutSesiLain() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: cabutSesiLain, onSuccess: () => queryClient.invalidateQueries({ queryKey: kunci.sesi }) });
}

export const usePreferensi = (aktif = true) => useQuery({ queryKey: kunci.preferensi, queryFn: getPreferensi, enabled: aktif, staleTime: 5 * 60_000 });

export function useUbahPreferensi() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ubahPreferensi,
    // Tampilan langsung berubah; dikembalikan bila server menolak
    onMutate: async (isi) => {
      await queryClient.cancelQueries({ queryKey: kunci.preferensi });
      const sebelum = queryClient.getQueryData<Preferensi>(kunci.preferensi);
      if (sebelum) queryClient.setQueryData(kunci.preferensi, { ...sebelum, ...isi });
      return { sebelum };
    },
    onError: (_e, _isi, konteks) => konteks?.sebelum && queryClient.setQueryData(kunci.preferensi, konteks.sebelum),
    onSuccess: (data) => queryClient.setQueryData(kunci.preferensi, data),
  });
}

export function useTema() {
  const { theme, setTheme } = useTheme();
  const { mutate } = useUbahPreferensi();
  const pilih = (tema: Tema) => {
    setTheme(tema);
    mutate({ tema });
  };
  return { tema: theme as Tema | undefined, pilih };
}

export function SinkronTema() {
  const { data } = usePreferensi();
  const { theme, setTheme } = useTheme();
  const sudah = useRef(false);
  useEffect(() => {
    if (!data || sudah.current) return;
    sudah.current = true;
    if (data.tema !== theme) setTheme(data.tema);
  }, [data, theme, setTheme]);
  return null;
}
