// =============================================================================
// API NOTIFIKASI
// =============================================================================
// Gunanya: Memanggil endpoint notifikasi dalam aplikasi milik user yang sedang masuk.
//
// Isi berkas:
//   - Notifikasi, DaftarNotifikasi : bentuk data dari backend
//   - getNotifikasi, bacaNotifikasi, bacaSemuaNotifikasi : pemanggil endpoint
//
// Dipakai oleh: features/notifikasi/hooks/use-notifikasi.ts
// =============================================================================

import { apiClient } from "@/lib/api-client";

export type Notifikasi = {
  id: number;
  jenis: "diperiksa" | "perlu_perbaikan";
  judul: string;
  isi: string | null;
  kegiatanId: number | null;
  dibacaAt: string | null;
  createdAt: string;
};

export type DaftarNotifikasi = { items: Notifikasi[]; belumDibaca: number };

export const getNotifikasi = () => apiClient.get<DaftarNotifikasi>("/notifikasi").then((r) => r.data);
export const bacaNotifikasi = (id: number) => apiClient.post<{ jumlah: number }>(`/notifikasi/${id}/baca`, {}).then((r) => r.data);
export const bacaSemuaNotifikasi = () => apiClient.post<{ jumlah: number }>("/notifikasi/baca-semua", {}).then((r) => r.data);
