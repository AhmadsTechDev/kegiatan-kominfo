// =============================================================================
// HOOK PENGGUNA SAAT INI (useCurrentUser)
// =============================================================================
// Gunanya: Mengambil ringkasan sesi pengguna aktif (id, nama, email, role) dari Better Auth
// untuk kebutuhan penyesuaian tampilan antarmuka klien.
//
// Isi berkas:
//   - useCurrentUser : hook pembaca data sesi aktif; validasi izin tetap dilakukan di backend
//
// Dipakai oleh: useLingkupPegawai dan komponen navigasi tata letak
// =============================================================================

"use client";

import { authClient } from "@/lib/auth-client";
import type { Role } from "@/types/auth";

export function useCurrentUser() {
  const { data, isPending } = authClient.useSession();
  const user = data?.user
    ? { id: data.user.id, name: data.user.name, email: data.user.email, role: data.user.role as Role }
    : null;
  return { user, isPending };
}
