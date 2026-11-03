// =============================================================================
// HOOKS PENGELOLAAN DATA ADMINISTRASI (TANSTACK QUERY)
// =============================================================================
// Gunanya: menyediakan hook React kustom berbasis TanStack Query untuk kueri
// data dan mutasi operasi master data, akun pengguna, audit log, dan permintaan.
//
// Isi berkas:
//   - adminKeys : definisi kunci kueri (query keys) terpusat untuk cache modul admin
//   - useSegarkan : fungsi pembantu pembatalan cache query terkait secara paralel
//   - useBidangAdmin, useSimpanBidang, useHapusBidang : kueri dan mutasi master bidang
//   - usePegawaiAdmin, useSimpanPegawai : kueri dan mutasi pegawai
//   - useJenisAdmin, useSimpanJenis : kueri dan mutasi master kategori kegiatan
//   - useAkunAdmin, useDetailAkun, useSimpanAkun, useStatusAkun, useHapusAkun : manajemen akun
//   - useKirimUlangUndangan, useResetSandi, useCabutSesiAkun, useUndangPegawai : aksi akun lainnya
//   - useAuditLog, useAuditDetail, usePilihanAudit : kueri jejak audit aktivitas
//   - usePermintaanAkun, useJumlahPermintaan, useProsesPermintaan : permintaan akun
//
// Catatan penting:
//   - Mutasi data otomatis membatalkan cache referensi form kegiatan dan audit log.
//   - Hook useJumlahPermintaan melakukan penyegaran berkala (polling) setiap 60 detik.
//
// Dipakai oleh: MasterView, PegawaiTab, BidangTab, JenisTab, AkunView, AuditLogView
// =============================================================================

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
  getAuditDetail,
  getJumlahPermintaan,
  getPermintaanAkun,
  getAuditLog,
  getJenisKegiatan,
  getPegawai,
  getPilihanAudit,
  getBidang,
  hapusAkun,
  hapusBidang,
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
import type { FilterAkun, FilterAudit, FilterPegawai, IsiAkun, IsiPegawaiBaru, HasilPegawaiBaru, IsiUndangan, IsiUnit, StatusPermintaan } from "../types";

export const adminKeys = {
  bidang: ["admin", "bidang"] as const,
  pegawai: ["admin", "pegawai"] as const,
  daftarPegawai: (f: FilterPegawai) => [...adminKeys.pegawai, f] as const,
  jenis: ["admin", "jenis-kegiatan"] as const,
  akun: ["admin", "akun"] as const,
  daftarAkun: (f: FilterAkun) => [...adminKeys.akun, "daftar", f] as const,
  detailAkun: (id: string) => [...adminKeys.akun, "detail", id] as const,
  audit: ["admin", "audit-log"] as const,
  daftarAudit: (f: FilterAudit) => [...adminKeys.audit, "daftar", f] as const,
  detailAudit: (id: number) => [...adminKeys.audit, "detail", id] as const,
  pilihanAudit: ["admin", "audit-log", "pilihan"] as const,
  permintaan: ["admin", "permintaan-akun"] as const,
  daftarPermintaan: (f: { status: StatusPermintaan | null; page: number }) => [...adminKeys.permintaan, "daftar", f] as const,
  jumlahPermintaan: ["admin", "permintaan-akun", "jumlah"] as const,
};

function useSegarkan(...kunci: (readonly unknown[])[]) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all(
      [...kunci, kegiatanKeys.referensi, adminKeys.audit].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
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

export const useAuditLog = (f: FilterAudit) =>
  useQuery({ queryKey: adminKeys.daftarAudit(f), queryFn: () => getAuditLog(f), placeholderData: keepPreviousData });

export const useAuditDetail = (id: number | null) =>
  useQuery({ queryKey: adminKeys.detailAudit(id ?? 0), queryFn: () => getAuditDetail(id!), enabled: id != null });

export const usePilihanAudit = () =>
  useQuery({ queryKey: adminKeys.pilihanAudit, queryFn: getPilihanAudit, staleTime: 60_000 });

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
