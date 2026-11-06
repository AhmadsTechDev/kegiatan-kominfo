import { apiClient } from "@/lib/api-client";
import type { Dokumentasi } from "../types";

// Pemanggil endpoint dokumentasi: unggah, ganti, hapus, dan URL berkas

export const urlDokumentasi = (d: Pick<Dokumentasi, "id" | "createdAt">, unduh = false) =>
  `/api/dokumentasi/${d.id}?v=${encodeURIComponent(d.createdAt)}${unduh ? "&unduh=1" : ""}`;

export async function unggahDokumentasi(kegiatanId: number, berkas: File, onProgres: (persen: number) => void) {
  const form = new FormData();
  form.append("berkas", berkas);
  const { data } = await apiClient.post<Dokumentasi>(`/kegiatan/${kegiatanId}/dokumentasi`, form, {
    onUploadProgress: (e) => e.total && onProgres(Math.round((e.loaded / e.total) * 100)),
  });
  return data;
}

export async function gantiDokumentasi(id: number, berkas: File) {
  const form = new FormData();
  form.append("berkas", berkas);
  const { data } = await apiClient.put<Dokumentasi>(`/dokumentasi/${id}`, form);
  return data;
}

export async function hapusDokumentasi(id: number) {
  await apiClient.delete(`/dokumentasi/${id}`);
}
