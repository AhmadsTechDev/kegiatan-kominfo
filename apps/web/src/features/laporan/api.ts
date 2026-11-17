import { apiClient } from "@/lib/api-client";
import type { CakupanLaporan, KegiatanDokumentasi, PratinjauLaporan } from "./types";

export const paramsCakupan = (c: CakupanLaporan) => Object.fromEntries(Object.entries(c).filter(([, v]) => v));

export async function getPratinjau(cakupan: CakupanLaporan) {
  const { data } = await apiClient.get<PratinjauLaporan>("/ekspor/pratinjau", { params: paramsCakupan(cakupan) });
  return data;
}

export async function getDokumentasiLaporan(cakupan: CakupanLaporan) {
  const { data } = await apiClient.get<KegiatanDokumentasi[]>("/ekspor/dokumentasi", { params: paramsCakupan(cakupan) });
  return data;
}

export async function unduhDokumentasiZip(cakupan: CakupanLaporan, kegiatanId?: number) {
  const res = await apiClient.get<Blob>("/ekspor/dokumentasi.zip", {
    params: { ...paramsCakupan(cakupan), ...(kegiatanId ? { kegiatan: kegiatanId } : {}) },
    responseType: "blob",
  });
  const disposisi = String(res.headers["content-disposition"] ?? "");
  const utf8 = disposisi.match(/filename\*=UTF-8''([^;]+)/);
  const biasa = disposisi.match(/filename="([^"]+)"/);
  const nama = utf8 ? decodeURIComponent(utf8[1]!) : (biasa?.[1] ?? "dokumentasi.zip");
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = nama;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

