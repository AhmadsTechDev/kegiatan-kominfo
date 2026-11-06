import { apiClient } from "@/lib/api-client";
import type { Draf, DrafRingkas, IsiDraf } from "../types";

// Pemanggil endpoint draf kegiatan milik pegawai yang login

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
