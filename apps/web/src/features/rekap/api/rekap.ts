import { apiClient } from "@/lib/api-client";
import type { NilaiFilter } from "@/components/shared/filter-bar";
import type { FormatEkspor, RekapData, SatuanRekap } from "../types";

// Pemanggil endpoint rekap dan unduh ekspor PDF

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
