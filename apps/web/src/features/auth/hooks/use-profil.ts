"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { Role, StatusAkun } from "@/types/auth";

/**
 * Profil lengkap pengguna aktif dari GET /api/me
 */

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
    bidang: { id: number; kode: string; nama: string; parent: { id: number; nama: string } | null };
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
