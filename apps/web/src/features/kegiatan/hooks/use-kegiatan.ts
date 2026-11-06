"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { dashboardKeys } from "@/features/dashboard/hooks/use-dashboard";
import { rekapKeys } from "@/features/rekap/hooks/use-rekap";
import { hapusDokumentasi } from "../api/dokumentasi";
import { getDaftarDraf, getDraf, hapusDraf, simpanDraf } from "../api/draf";
import {
  buatKegiatan,
  getDaftarKegiatan,
  getKegiatan,
  getReferensi,
  hapusKegiatan,
  periksaKegiatan,
  selesaikanKegiatan,
  ubahKegiatan,
} from "../api/kegiatan";
import type { FilterKegiatan, KegiatanPayload } from "../types";

/**
 * Hook TanStack Query untuk kegiatan dan draf
 */

/**
 * KONSEP query key: "alamat" data di cache TanStack Query. Data dengan key sama dibagikan ke semua komponen.
 * Key disusun bertingkat (["kegiatan", "detail", 5]), sehingga menyegarkan ["kegiatan"] ikut menyegarkan
 * semua turunannya sekaligus (daftar, detail, draf).
 */
export const kegiatanKeys = {
  all: ["kegiatan"] as const,
  daftar: (filter: FilterKegiatan) => [...kegiatanKeys.all, "daftar", filter] as const,
  detail: (id: number) => [...kegiatanKeys.all, "detail", id] as const,
  referensi: ["referensi"] as const,
  draf: () => [...kegiatanKeys.all, "draf"] as const,
  drafDetail: (id: number) => [...kegiatanKeys.draf(), id] as const,
};

/**
 * KONSEP useQuery: mengambil data lalu mengembalikan { data, isPending, isError, refetch, ... }.
 * Filter adalah bagian dari key, jadi mengganti filter otomatis mengambil data baru.
 * keepPreviousData membuat data lama tetap tampil (agak pudar) selama data baru dimuat, sehingga tabel tidak berkedip.
 * @param filter filter dan halaman yang sedang aktif
 */
export function useDaftarKegiatan(filter: FilterKegiatan) {
  return useQuery({
    queryKey: kegiatanKeys.daftar(filter),
    queryFn: () => getDaftarKegiatan(filter),
    placeholderData: keepPreviousData,
  });
}

export const idValid = (id: number) => Number.isInteger(id) && id > 0;

export function useKegiatan(id: number) {
  /**
   * enabled: false menunda pengambilan data, di sini sampai id dari URL sah (angka positif).
   */
  return useQuery({ queryKey: kegiatanKeys.detail(id), queryFn: () => getKegiatan(id), enabled: idValid(id) });
}

export function useReferensi() {
  /**
   * Data referensi (bidang, jenis, pegawai) jarang berubah, jadi dianggap segar selama 5 menit.
   */
  return useQuery({ queryKey: kegiatanKeys.referensi, queryFn: getReferensi, staleTime: 5 * 60_000 });
}

/**
 * KONSEP invalidateQueries: menandai data di cache sebagai usang lalu mengambil ulang yang sedang tampil.
 * Setelah kegiatan berubah, angka di dashboard dan rekap juga ikut berubah, jadi ketiganya disegarkan.
 */
function useSegarkan() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: kegiatanKeys.all }),
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
      queryClient.invalidateQueries({ queryKey: rekapKeys.all }),
    ]);
}

/**
 * KONSEP useMutation: untuk aksi yang MENGUBAH data (buat, ubah, hapus). Komponen memanggil mutate(data),
 * lalu mendapat isPending selama proses dan bisa memberi onSuccess/onError sendiri.
 * onSuccess di sini menyegarkan cache agar daftar langsung menampilkan kegiatan baru.
 */
export function useBuatKegiatan() {
  const segarkan = useSegarkan();
  return useMutation({ mutationFn: buatKegiatan, onSuccess: segarkan });
}

export function useUbahKegiatan(id: number) {
  const segarkan = useSegarkan();
  return useMutation({
    mutationFn: (payload: KegiatanPayload & { expectedUpdatedAt: string }) => ubahKegiatan(id, payload),
    onSuccess: segarkan,
  });
}

export function useSelesaikanKegiatan() {
  const segarkan = useSegarkan();
  return useMutation({
    mutationFn: (v: { id: number; expectedUpdatedAt: string }) => selesaikanKegiatan(v.id, v.expectedUpdatedAt),
    onSuccess: segarkan,
  });
}

export function usePeriksaKegiatan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: number; catatan: string }) => periksaKegiatan(v.id, v.catatan),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: kegiatanKeys.all }),
        queryClient.invalidateQueries({ queryKey: ["pantau"] }),
      ]),
  });
}

export function useHapusKegiatan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: hapusKegiatan,
    onSuccess: (_, id) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: [...kegiatanKeys.all, "daftar"] }),

        /**
         * Detail hanya ditandai usang (tanpa ambil ulang) agar halaman tidak berkedip sebelum pindah;
         * bila pengguna menekan Kembali, detail diambil ulang dan tampil "tidak ditemukan"
         */
        queryClient.invalidateQueries({ queryKey: kegiatanKeys.detail(id), refetchType: "none" }),
        queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
        queryClient.invalidateQueries({ queryKey: rekapKeys.all }),
      ]),
  });
}

export function useHapusDokumentasi(kegiatanId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: hapusDokumentasi,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: kegiatanKeys.detail(kegiatanId) }),
        queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
      ]),
  });
}

export function useDaftarDraf(aktif = true) {
  return useQuery({ queryKey: kegiatanKeys.draf(), queryFn: getDaftarDraf, enabled: aktif });
}

export function useDraf(id: number | null) {
  return useQuery({ queryKey: kegiatanKeys.drafDetail(id ?? 0), queryFn: () => getDraf(id!), enabled: id != null && idValid(id) });
}

export function useSimpanDraf() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: simpanDraf, onSuccess: () => queryClient.invalidateQueries({ queryKey: kegiatanKeys.draf() }) });
}

export function useHapusDraf() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: hapusDraf, onSuccess: () => queryClient.invalidateQueries({ queryKey: kegiatanKeys.draf() }) });
}
