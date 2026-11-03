// =============================================================================
// API KEGIATAN DINAS
// =============================================================================
// Gunanya: Menyediakan fungsi-fungsi pemanggil endpoint backend REST API untuk
// seluruh operasi data kegiatan, mulai dari pembacaan, pembuatan, pengubahan,
// pembatalan, penghapusan, hingga pemeriksaan status oleh pimpinan.
//
// Isi berkas:
//   - UKURAN_HALAMAN    : konstanta batas jumlah data per halaman (20 item)
//   - getDaftarKegiatan : mengambil daftar kegiatan dengan filter dan paginasi
//   - getKegiatan       : mengambil rincian data satu kegiatan berdasarkan ID
//   - getReferensi      : mengambil data opsi master (jenis, bidang, pegawai)
//   - buatKegiatan      : mengirim data kegiatan baru (bisa melanjutkan draf)
//   - ubahKegiatan      : memperbarui data kegiatan dengan expectedUpdatedAt
//   - selesaikanKegiatan: menyelesaikan kegiatan yang berlangsung (waktu selesai menjadi sekarang)
//   - periksaKegiatan   : mencatat hasil pemeriksaan pimpinan beserta catatan
//   - hapusKegiatan     : menghapus rekaman kegiatan secara permanen
//
// Catatan penting:
//   - Menggunakan expectedUpdatedAt untuk mencegah konflik data (optimistic locking).
//   - Parameter drafId dikirim saat rilis draf agar backend menghapus draf terkait.
//
// Dipakai oleh: hooks/use-kegiatan.ts
// =============================================================================

import { apiClient } from "@/lib/api-client";
import type { DaftarKegiatan, FilterKegiatan, HasilSimpan, KegiatanDetail, KegiatanPayload, Referensi } from "../types";

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

export async function periksaKegiatan(id: number, status: "diperiksa" | "perlu_perbaikan", catatan: string | null) {
  const { data } = await apiClient.post<{ id: number; statusPemeriksaan: string }>(`/kegiatan/${id}/pemeriksaan`, { status, catatan });
  return data;
}

export async function hapusKegiatan(id: number) {
  await apiClient.delete(`/kegiatan/${id}`);
}
