// =============================================================================
// HOOK DATA PROFIL PENGGUNA (useProfil)
// =============================================================================
// Gunanya: Mengambil data profil lengkap pengguna aktif dari backend via endpoint GET /api/me,
// mencakup identitas akun, status & verifikasi email, foto, data pegawai, dan unit kerja.
//
// Isi berkas:
//   - Profil    : tipe data struktur respons profil pengguna dari endpoint GET /api/me
//   - useProfil : hook query TanStack Query untuk memuat data profil dengan staleTime 5 menit
//
// Dipakai oleh: UserMenu, SidebarAccount, KegiatanForm, dan PengaturanView
// =============================================================================

"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { Role, StatusAkun } from "@/types/auth";

export type Profil = {
  id: string;
  name: string;
  email: string;
  emailBaru: string | null;
  emailVerified: boolean;
  role: Role;
  status: StatusAkun;
  kontak: string | null;
  foto: string | null;
  createdAt: string;
  pegawai: {
    id: number;
    nip: string | null;
    nama: string;
    jabatan: string | null;
    unitKerja: { id: number; kode: string; nama: string; parent: { id: number; nama: string } | null };
  } | null;
};

export function useProfil(aktif = true) {
  return useQuery({
    queryKey: ["me"],
    enabled: aktif,
    queryFn: async () => (await apiClient.get<Profil>("/me")).data,
    staleTime: 5 * 60_000,
  });
}
