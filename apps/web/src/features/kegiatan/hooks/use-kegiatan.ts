// =============================================================================
// HOOK PENGELOLA DATA KEGIATAN (TANSTACK QUERY)
// =============================================================================
// Gunanya: Menyediakan kumpulan hook kueri dan mutasi TanStack Query untuk membaca,
// menambah, memperbarui, membatalkan, memeriksa, dan menghapus kegiatan serta draf.
//
// Isi berkas:
//   - kegiatanKeys       : hierarki kunci cache data kegiatan, referensi, dan draf
//   - idValid            : fungsi validasi parameter ID bilangan bulat positif
//   - useDaftarKegiatan  : hook pembaca daftar kegiatan dengan keepPreviousData
//   - useKegiatan        : hook pembaca rincian detail kegiatan tunggal
//   - useReferensi       : hook pembaca data master (jenis, bidang, pegawai)
//   - useBuatKegiatan    : hook mutasi pencatatan kegiatan baru
//   - useUbahKegiatan    : hook mutasi pengubahan data kegiatan
//   - useBatalkanKegiatan: hook mutasi pembatalan kegiatan disertai alasan
//   - usePeriksaKegiatan : hook mutasi pemeriksaan dan verifikasi pimpinan
//   - useHapusKegiatan   : hook mutasi penghapusan kegiatan
//
// Catatan penting:
//   - Setiap mutasi otomatis menyegarkan cache data terkait, dashboard, dan rekap.
//   - Mutasi hapus tidak menyegarkan kueri detail guna mencegah 404 sebelum redirect.
//   - Pimpinan dinonaktifkan dari kueri draf karena tidak memiliki akses pencatatan.
//
// Dipakai oleh: modul kegiatan (komponen form, detail, list, draf, dan aksi)
// =============================================================================

"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { dashboardKeys } from "@/features/dashboard/hooks/use-dashboard";
import { rekapKeys } from "@/features/rekap/hooks/use-rekap";
import { hapusDokumentasi } from "../api/dokumentasi";
import { getDaftarDraf, getDraf, hapusDraf, simpanDraf } from "../api/draf";
import {
  batalkanKegiatan,
  buatKegiatan,
  getDaftarKegiatan,
  getKegiatan,
  getReferensi,
  hapusKegiatan,
  periksaKegiatan,
  ubahKegiatan,
} from "../api/kegiatan";
import type { FilterKegiatan, KegiatanPayload } from "../types";

export const kegiatanKeys = {
  all: ["kegiatan"] as const,
  daftar: (filter: FilterKegiatan) => [...kegiatanKeys.all, "daftar", filter] as const,
  detail: (id: number) => [...kegiatanKeys.all, "detail", id] as const,
  referensi: ["referensi"] as const,
  draf: () => [...kegiatanKeys.all, "draf"] as const,
  drafDetail: (id: number) => [...kegiatanKeys.draf(), id] as const,
};

export function useDaftarKegiatan(filter: FilterKegiatan) {
  return useQuery({
    queryKey: kegiatanKeys.daftar(filter),
    queryFn: () => getDaftarKegiatan(filter),
    placeholderData: keepPreviousData,
  });
}

export const idValid = (id: number) => Number.isInteger(id) && id > 0;

export function useKegiatan(id: number) {
  return useQuery({ queryKey: kegiatanKeys.detail(id), queryFn: () => getKegiatan(id), enabled: idValid(id) });
}

export function useReferensi() {
  return useQuery({ queryKey: kegiatanKeys.referensi, queryFn: getReferensi, staleTime: 5 * 60_000 });
}

function useSegarkan() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: kegiatanKeys.all }),
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
      queryClient.invalidateQueries({ queryKey: rekapKeys.all }),
    ]);
}

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

export function useBatalkanKegiatan() {
  const segarkan = useSegarkan();
  return useMutation({
    mutationFn: (v: { id: number; alasan: string; expectedUpdatedAt: string }) =>
      batalkanKegiatan(v.id, v.alasan, v.expectedUpdatedAt),
    onSuccess: segarkan,
  });
}

export function usePeriksaKegiatan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: number; status: "diperiksa" | "perlu_perbaikan"; catatan: string | null }) => periksaKegiatan(v.id, v.status, v.catatan),
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
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: [...kegiatanKeys.all, "daftar"] }),
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
