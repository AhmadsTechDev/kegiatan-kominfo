"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { kegiatanKeys } from "@/features/kegiatan/hooks/use-kegiatan";
import {
  aktifkanAkun,
  buatAkun,
  buatJenisKegiatan,
  buatPegawai,
  buatBidang,
  cabutSesiAkun,
  getAkun,
  getDetailAkun,
  getJumlahPermintaan,
  getPermintaanAkun,
  getJenisKegiatan,
  getPegawai,
  getBidang,
  hapusAkun,
  hapusBidang,
  hapusPegawai,
  kirimUlangUndangan,
  nonaktifkanAkun,
  resetSandiAkun,
  setujuiPermintaan,
  tolakPermintaan,
  undangPegawai,
  ubahAkun,
  ubahJenisKegiatan,
  ubahPegawai,
  ubahBidang,
} from "../api/admin";
import type { FilterAkun, FilterPegawai, IsiAkun, IsiPegawaiBaru, HasilPegawaiBaru, IsiUndangan, IsiUnit, StatusPermintaan } from "../types";

/**
 * Hook TanStack Query untuk master data, akun, dan permintaan akun
 */

export const adminKeys = {
  bidang: ["admin", "bidang"] as const,
  pegawai: ["admin", "pegawai"] as const,
  daftarPegawai: (f: FilterPegawai) => [...adminKeys.pegawai, f] as const,
  jenis: ["admin", "jenis-kegiatan"] as const,
  akun: ["admin", "akun"] as const,
  daftarAkun: (f: FilterAkun) => [...adminKeys.akun, "daftar", f] as const,
  detailAkun: (id: string) => [...adminKeys.akun, "detail", id] as const,
  permintaan: ["admin", "permintaan-akun"] as const,
  daftarPermintaan: (f: { status: StatusPermintaan | null; page: number }) => [...adminKeys.permintaan, "daftar", f] as const,
  jumlahPermintaan: ["admin", "permintaan-akun", "jumlah"] as const,
};

/**
 * `...kunci` (rest parameter) menampung berapa pun query key yang dikirim, lalu semuanya disegarkan.
 * Referensi kegiatan selalu ikut disegarkan, karena perubahan master data mengubah pilihan form.
 */
function useSegarkan(...kunci: (readonly unknown[])[]) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all(
      [...kunci, kegiatanKeys.referensi].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    );
}

export const useBidangAdmin = () => useQuery({ queryKey: adminKeys.bidang, queryFn: getBidang });

export function useSimpanBidang() {
  const segarkan = useSegarkan(adminKeys.bidang, adminKeys.pegawai);
  return useMutation({
    mutationFn: ({ id, isi }: { id?: number; isi: IsiUnit }) => (id ? ubahBidang(id, isi) : buatBidang(isi)),
    onSuccess: segarkan,
  });
}

export function useHapusBidang() {
  const segarkan = useSegarkan(adminKeys.bidang, adminKeys.pegawai);
  return useMutation({ mutationFn: (id: number) => hapusBidang(id), onSuccess: segarkan });
}

export const usePegawaiAdmin = (f: FilterPegawai) =>
  useQuery({ queryKey: adminKeys.daftarPegawai(f), queryFn: () => getPegawai(f), placeholderData: keepPreviousData });

export function useSimpanPegawai() {
  const segarkan = useSegarkan(adminKeys.pegawai, adminKeys.bidang, adminKeys.akun);
  return useMutation({
    mutationFn: ({ id, isi }: { id?: number; isi: IsiPegawaiBaru }): Promise<{ id: number; undangan?: HasilPegawaiBaru["undangan"] }> =>
      id ? ubahPegawai(id, isi) : buatPegawai(isi),
    onSuccess: segarkan,
  });
}

export const useJenisAdmin = () => useQuery({ queryKey: adminKeys.jenis, queryFn: getJenisKegiatan });

export function useSimpanJenis() {
  const segarkan = useSegarkan(adminKeys.jenis);
  return useMutation({
    mutationFn: ({ id, isi }: { id?: number; isi: { nama: string; aktif?: boolean } }) =>
      id ? ubahJenisKegiatan(id, isi) : buatJenisKegiatan(isi),
    onSuccess: segarkan,
  });
}

export const useAkunAdmin = (f: FilterAkun) =>
  useQuery({ queryKey: adminKeys.daftarAkun(f), queryFn: () => getAkun(f), placeholderData: keepPreviousData });

export const useDetailAkun = (id: string) => useQuery({ queryKey: adminKeys.detailAkun(id), queryFn: () => getDetailAkun(id) });

export function useSimpanAkun() {
  const segarkan = useSegarkan(adminKeys.akun, adminKeys.pegawai);
  return useMutation({
    mutationFn: ({ id, isi }: { id?: string; isi: IsiAkun }) => (id ? ubahAkun(id, isi) : buatAkun(isi)),
    onSuccess: segarkan,
  });
}

export function useStatusAkun() {
  const segarkan = useSegarkan(adminKeys.akun);
  return useMutation({
    mutationFn: ({ id, aktif, alasan }: { id: string; aktif: boolean; alasan?: string }) =>
      aktif ? aktifkanAkun(id) : nonaktifkanAkun(id, alasan ?? ""),
    onSuccess: segarkan,
  });
}

export function useHapusAkun() {
  const segarkan = useSegarkan(adminKeys.akun, adminKeys.pegawai);
  return useMutation({ mutationFn: (id: string) => hapusAkun(id), onSuccess: segarkan });
}

export function useKirimUlangUndangan() {
  const segarkan = useSegarkan(adminKeys.akun);
  return useMutation({ mutationFn: kirimUlangUndangan, onSuccess: segarkan });
}

export function useResetSandi() {
  const segarkan = useSegarkan(adminKeys.akun);
  return useMutation({ mutationFn: resetSandiAkun, onSuccess: segarkan });
}

export function useCabutSesiAkun() {
  const segarkan = useSegarkan(adminKeys.akun);
  return useMutation({ mutationFn: cabutSesiAkun, onSuccess: segarkan });
}

export function useHapusPegawai() {
  const segarkan = useSegarkan(adminKeys.pegawai);
  return useMutation({ mutationFn: (id: number) => hapusPegawai(id), onSuccess: segarkan });
}

export function useUndangPegawai() {
  const segarkan = useSegarkan(adminKeys.pegawai, adminKeys.akun);
  return useMutation({
    mutationFn: ({ pegawaiId, isi }: { pegawaiId: number; isi: IsiUndangan }) => undangPegawai(pegawaiId, isi),
    onSuccess: segarkan,
  });
}

export const usePermintaanAkun = (f: { status: StatusPermintaan | null; page: number }) =>
  useQuery({ queryKey: adminKeys.daftarPermintaan(f), queryFn: () => getPermintaanAkun(f), placeholderData: keepPreviousData });

export const useJumlahPermintaan = (aktif = true) =>
  useQuery({ queryKey: adminKeys.jumlahPermintaan, queryFn: getJumlahPermintaan, enabled: aktif, refetchInterval: 60_000 });

export function useProsesPermintaan() {
  const segarkan = useSegarkan(adminKeys.permintaan, adminKeys.akun, adminKeys.pegawai);
  return useMutation({
    mutationFn: async (v: { id: number; aksi: "setujui"; isi: IsiUndangan } | { id: number; aksi: "tolak"; alasan: string }) => {
      if (v.aksi === "setujui") await setujuiPermintaan(v.id, v.isi);
      else await tolakPermintaan(v.id, v.alasan);
    },
    onSuccess: segarkan,
  });
}
