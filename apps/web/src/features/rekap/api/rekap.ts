// =============================================================================
// API REKAPITULASI DAN EKSPOR KEGIATAN
// =============================================================================
// Gunanya: Memanggil endpoint API backend untuk mengambil ringkasan statistik
// rekapitulasi kegiatan serta mengunduh berkas ekspor laporan (Excel atau PDF).
//
// Isi berkas:
//   - getRekap    : memanggil GET /rekap dengan parameter filter terisi (FR-10)
//   - unduhEkspor : mengunduh blob berkas ekspor dan memicu unduhan di peramban
//
// Dipakai oleh: frontend/src/features/rekap/hooks/use-rekap.ts
// =============================================================================

import { apiClient } from "@/lib/api-client";
import type { NilaiFilter } from "@/components/shared/filter-bar";
import type { FormatEkspor, RekapData, SatuanRekap } from "../types";

function paramsFilter(filter: NilaiFilter) {
  const { q, dari, sampai, unit, jenis, status, pegawai } = filter;
  return Object.fromEntries(
    Object.entries({ q: q.trim(), dari, sampai, unit, jenis, status, pegawai }).filter(([, v]) => v !== null && v !== ""),
  );
}

export async function getRekap(filter: NilaiFilter, satuan: SatuanRekap) {
  const { data } = await apiClient.get<RekapData>("/rekap", { params: { ...paramsFilter(filter), satuan } });
  return data;
}

function namaBerkas(disposisi: string | undefined, format: FormatEkspor) {
  const cocok = disposisi?.match(/filename="([^"]+)"/);
  return cocok?.[1] ?? `rekap-kegiatan.${format}`;
}

export async function unduhEkspor(format: FormatEkspor, filter: NilaiFilter) {
  const res = await apiClient.get<Blob>(`/ekspor/kegiatan.${format}`, {
    params: paramsFilter(filter),
    responseType: "blob",
  });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = namaBerkas(res.headers["content-disposition"], format);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { jumlah: Number(res.headers["x-jumlah-kegiatan"] ?? 0) };
}
