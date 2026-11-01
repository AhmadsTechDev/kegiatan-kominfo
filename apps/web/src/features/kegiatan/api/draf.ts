// =============================================================================
// API DRAF KEGIATAN
// =============================================================================
// Gunanya: Menyediakan fungsi klien HTTP untuk mengambil, menyimpan, dan
// menghapus draf isian kegiatan sementara milik pegawai yang login.
//
// Catatan penting:
//   - Draf bersifat privat dan hanya dapat dilihat oleh pembuatnya sendiri.
//   - Simpan tanpa id membuat draf baru; dengan id menimpa draf yang dilanjutkan.
//
// Dipakai oleh: use-kegiatan.ts
// =============================================================================

import { apiClient } from "@/lib/api-client";
import type { Draf, DrafRingkas, IsiDraf } from "../types";

export async function getDaftarDraf() {
  const { data } = await apiClient.get<DrafRingkas[]>("/draf-kegiatan");
  return data;
}

export async function getDraf(id: number) {
  const { data } = await apiClient.get<Draf>(`/draf-kegiatan/${id}`);
  return data;
}

export async function simpanDraf({ id, isi }: { id?: number; isi: IsiDraf }) {
  const { data } = id ? await apiClient.put<Draf>(`/draf-kegiatan/${id}`, { isi }) : await apiClient.post<Draf>("/draf-kegiatan", { isi });
  return data;
}

export async function hapusDraf(id: number) {
  await apiClient.delete(`/draf-kegiatan/${id}`);
}
