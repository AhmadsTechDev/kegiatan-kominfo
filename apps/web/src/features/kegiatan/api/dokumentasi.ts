import { apiClient } from "@/lib/api-client";
import type { Dokumentasi } from "../types";

/**
 * Pemanggil endpoint dokumentasi: unggah, ganti, hapus, dan URL berkas
 */

/**
 * ?v=createdAt membuat alamat berubah saat berkas diganti, jadi peramban tidak menampilkan berkas lama dari cache.
 */
export const urlDokumentasi = (d: Pick<Dokumentasi, "id" | "createdAt">, unduh = false) =>
  `/api/dokumentasi/${d.id}?v=${encodeURIComponent(d.createdAt)}${unduh ? "&unduh=1" : ""}`;

/**
 * KONSEP FormData: format kiriman untuk berkas (multipart/form-data), berbeda dengan JSON biasa.
 * onUploadProgress dari axios dipanggil berkali-kali selama unggah, dipakai untuk mengisi bilah progres.
 * @param onProgres dipanggil dengan persentase 0-100
 * @returns data dokumentasi yang baru tersimpan
 */
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
