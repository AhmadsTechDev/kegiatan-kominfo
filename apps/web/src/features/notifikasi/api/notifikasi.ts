import { apiClient } from "@/lib/api-client";

// Pemanggil endpoint notifikasi milik pengguna yang login

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
