// =============================================================================
// HOOKS PENGELOLAAN DATA ADMINISTRASI (TANSTACK QUERY)
// =============================================================================
// Gunanya: menyediakan hook React kustom berbasis TanStack Query untuk kueri
// data dan mutasi operasi master data, akun pengguna, audit log, dan permintaan.
//
// Isi berkas:
//   - adminKeys : definisi kunci kueri (query keys) terpusat untuk cache modul admin
//   - useSegarkan : fungsi pembantu pembatalan cache query terkait secara paralel
//   - useUnitKerjaAdmin, useSimpanUnitKerja : kueri dan mutasi master unit kerja
//   - useJenisUnitAdmin, useSimpanJenisUnit : kueri dan mutasi hierarki jenis unit
//   - usePegawaiAdmin, useSimpanPegawai, useImporPegawai : kueri dan mutasi pegawai
//   - useJenisAdmin, useSimpanJenis : kueri dan mutasi master kategori kegiatan
//   - useAkunAdmin, useSimpanAkun, useStatusAkun, useHapusAkun : manajemen akun
//   - useHubungkanPegawai, useResetSandi, useUndangPegawai : administrasi akun pegawai
//   - useAuditLog, useAuditDetail, usePilihanAudit : kueri jejak audit aktivitas
//   - usePermintaanAkun, useJumlahPermintaan, useProsesPermintaan : permintaan akun
//
// Catatan penting:
//   - Mutasi data otomatis membatalkan cache referensi form kegiatan dan audit log.
//   - Hook useJumlahPermintaan melakukan penyegaran berkala (polling) setiap 60 detik.
//
// Dipakai oleh: MasterView, PegawaiTab, UnitKerjaTab, JenisTab, AkunView, AuditLogView
// =============================================================================

"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { kegiatanKeys } from "@/features/kegiatan/hooks/use-kegiatan";
import {
  aktifkanAkun,
  buatAkun,
  buatJenisKegiatan,
  buatJenisUnit,
  buatPegawai,
  buatUnitKerja,
  getAkun,
  getAuditDetail,
  getJumlahPermintaan,
  getPermintaanAkun,
  getAuditLog,
  getJenisKegiatan,
  getJenisUnit,
  getPegawai,
  imporPegawai,
  getPilihanAudit,
  getUnitKerja,
  hapusAkun,
  nonaktifkanAkun,
  resetSandiAkun,
  hubungkanPegawai,
  setujuiPermintaan,
  tolakPermintaan,
  undangPegawai,
  ubahAkun,
  ubahJenisKegiatan,
  ubahJenisUnit,
  ubahPegawai,
  ubahUnitKerja,
} from "../api/admin";
import type { FilterAkun, FilterAudit, FilterPegawai, IsiAkun, IsiHubungkan, IsiJenisUnit, IsiPegawaiBaru, HasilPegawaiBaru, IsiUndangan, IsiUnit, StatusPermintaan } from "../types";

export const adminKeys = {
  unitKerja: ["admin", "unit-kerja"] as const,
  jenisUnit: ["admin", "jenis-unit"] as const,
  pegawai: ["admin", "pegawai"] as const,
  daftarPegawai: (f: FilterPegawai) => [...adminKeys.pegawai, f] as const,
  jenis: ["admin", "jenis-kegiatan"] as const,
  akun: ["admin", "akun"] as const,
  daftarAkun: (f: FilterAkun) => [...adminKeys.akun, f] as const,
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

export const useUnitKerjaAdmin = () => useQuery({ queryKey: adminKeys.unitKerja, queryFn: getUnitKerja });

export function useSimpanUnitKerja() {
  const segarkan = useSegarkan(adminKeys.unitKerja, adminKeys.pegawai);
  return useMutation({
    mutationFn: ({ id, isi }: { id?: number; isi: IsiUnit }) => (id ? ubahUnitKerja(id, isi) : buatUnitKerja(isi)),
    onSuccess: segarkan,
  });
}

export const useJenisUnitAdmin = () => useQuery({ queryKey: adminKeys.jenisUnit, queryFn: getJenisUnit });

export function useSimpanJenisUnit() {
  const segarkan = useSegarkan(adminKeys.jenisUnit, adminKeys.unitKerja);
  return useMutation({
    mutationFn: ({ id, isi }: { id?: number; isi: IsiJenisUnit }) => (id ? ubahJenisUnit(id, isi) : buatJenisUnit(isi)),
    onSuccess: segarkan,
  });
}

export const usePegawaiAdmin = (f: FilterPegawai) =>
  useQuery({ queryKey: adminKeys.daftarPegawai(f), queryFn: () => getPegawai(f), placeholderData: keepPreviousData });

export function useSimpanPegawai() {
  const segarkan = useSegarkan(adminKeys.pegawai, adminKeys.unitKerja, adminKeys.akun);
  return useMutation({
    mutationFn: ({ id, isi }: { id?: number; isi: IsiPegawaiBaru }): Promise<{ id: number; undangan?: HasilPegawaiBaru["undangan"] }> =>
      id ? ubahPegawai(id, isi) : buatPegawai(isi),
    onSuccess: segarkan,
  });
}

export function useImporPegawai() {
  const segarkan = useSegarkan(adminKeys.pegawai, adminKeys.unitKerja);
  return useMutation({
    mutationFn: ({ berkas, simpan }: { berkas: File; simpan: boolean }) => imporPegawai(berkas, simpan),
    onSuccess: (hasil) => (hasil.disimpan ? segarkan() : undefined),
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

export function useSimpanAkun() {
  const segarkan = useSegarkan(adminKeys.akun, adminKeys.pegawai);
  return useMutation({
    mutationFn: ({ id, isi, password }: { id?: string; isi: IsiAkun; password?: string }) =>
      id ? ubahAkun(id, isi) : buatAkun({ ...isi, password: password ?? "" }),
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

export function useHubungkanPegawai() {
  const segarkan = useSegarkan(adminKeys.akun, adminKeys.pegawai, adminKeys.unitKerja);
  return useMutation({
    mutationFn: ({ id, isi }: { id: string; isi: IsiHubungkan }) => hubungkanPegawai(id, isi),
    onSuccess: segarkan,
  });
}

export function useResetSandi() {
  const segarkan = useSegarkan(adminKeys.akun);
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) => resetSandiAkun(id, password),
    onSuccess: segarkan,
  });
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
