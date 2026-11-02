// =============================================================================
// API PENGATURAN AKUN SENDIRI
// =============================================================================
// Gunanya: Fungsi pemanggil endpoint /api/me untuk kontak, ganti email, ganti kata sandi,
// sesi login aktif, dan preferensi tampilan/notifikasi.
//
// Isi berkas:
//   - ubahKontak, gantiEmail, batalGantiEmail : data akun yang boleh diubah pemiliknya
//   - gantiSandi : ganti kata sandi; sesi di perangkat lain dicabut
//   - getSesi, cabutSesi, cabutSesiLain : sesi login aktif
//   - getPreferensi, ubahPreferensi : tema dan notifikasi
//   - SesiLogin, Preferensi, Tema : tipe data respons
//
// Dipakai oleh: hooks/use-akun-saya.ts
// =============================================================================

import { apiClient } from "@/lib/api-client";
import type { Profil } from "@/features/auth/hooks/use-profil";

export type Tema = "light" | "dark" | "system";
export type Preferensi = { tema: Tema; notifPengingatKegiatan: boolean; notifPengingatDokumentasi: boolean };
export type SesiLogin = {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  sesiIni: boolean;
};

export const ubahKontak = (kontak: string | null) => apiClient.patch<Profil>("/me", { kontak }).then((r) => r.data);

export const gantiEmail = (isi: { email: string; password: string }) =>
  apiClient.patch<{ emailBaru: string; kedaluwarsa: string }>("/me/email", isi).then((r) => r.data);
export const batalGantiEmail = () => apiClient.delete<{ emailBaru: null }>("/me/email").then((r) => r.data);

export const gantiSandi = (isi: { sandiLama: string; sandiBaru: string; cabutSesiLain: boolean }) =>
  apiClient.patch<{ sesiDicabut: number }>("/me/sandi", isi).then((r) => r.data);

export const getSesi = () => apiClient.get<SesiLogin[]>("/me/sesi").then((r) => r.data);
export const cabutSesi = (id: string) => apiClient.delete<{ id: string }>(`/me/sesi/${id}`).then((r) => r.data);
export const cabutSesiLain = () => apiClient.delete<{ jumlah: number }>("/me/sesi").then((r) => r.data);

export const getPreferensi = () => apiClient.get<Preferensi>("/me/preferensi").then((r) => r.data);
export const ubahPreferensi = (isi: Partial<Preferensi>) => apiClient.patch<Preferensi>("/me/preferensi", isi).then((r) => r.data);
