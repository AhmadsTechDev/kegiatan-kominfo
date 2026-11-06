import { apiClient } from "@/lib/api-client";
import type { DaftarKegiatan, FilterKegiatan, HasilSimpan, KegiatanDetail, KegiatanPayload, Referensi } from "../types";

// Pemanggil endpoint kegiatan: baca, buat, ubah, batal, hapus, dan periksa

export const UKURAN_HALAMAN = 20;

export async function getDaftarKegiatan(filter: FilterKegiatan) {
  const params = Object.fromEntries(
    Object.entries({ ...filter, q: filter.q.trim(), pageSize: UKURAN_HALAMAN }).filter(([, v]) => v !== null && v !== ""),
  );
  const { data } = await apiClient.get<DaftarKegiatan>("/kegiatan", { params });
  return data;
}

export async function getKegiatan(id: number) {
  const { data } = await apiClient.get<KegiatanDetail>(`/kegiatan/${id}`);
  return data;
}

export async function getReferensi() {
  const { data } = await apiClient.get<Referensi>("/referensi");
  return data;
}

export async function buatKegiatan(payload: KegiatanPayload & { drafId?: number }) {
  const { data } = await apiClient.post<HasilSimpan>("/kegiatan", payload);
  return data;
}

export async function ubahKegiatan(id: number, payload: KegiatanPayload & { expectedUpdatedAt: string }) {
  const { data } = await apiClient.patch<HasilSimpan>(`/kegiatan/${id}`, payload);
  return data;
}

export async function selesaikanKegiatan(id: number, expectedUpdatedAt: string) {
  const { data } = await apiClient.post<HasilSimpan>(`/kegiatan/${id}/selesai`, { expectedUpdatedAt });
  return data;
}

// Pimpinan/admin menandai kegiatan perlu perbaikan beserta catatannya
export async function periksaKegiatan(id: number, catatan: string) {
  const { data } = await apiClient.post<{ id: number; statusPemeriksaan: string }>(`/kegiatan/${id}/pemeriksaan`, { catatan });
  return data;
}

export async function hapusKegiatan(id: number) {
  await apiClient.delete(`/kegiatan/${id}`);
}
