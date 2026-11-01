// =============================================================================
// HOOK PROSES KELUAR (useLogout)
// =============================================================================
// Gunanya: Menangani proses keluar akun pengguna, menghapus seluruh cache TanStack
// Query di peramban, dan mengarahkan kembali ke halaman masuk.
//
// Isi berkas:
//   - useLogout : hook pemanggil signOut, pembersih cache query, dan pengalih rute ke login
//
// Dipakai oleh: UserMenu dan SidebarAccount pada navigasi aplikasi
// =============================================================================

"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { authClient } from "@/lib/auth-client";

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();

  const logout = () =>
    startTransition(async () => {
      await authClient.signOut();
      queryClient.clear();
      router.replace("/login");
      router.refresh();
    });

  return { logout, pending };
}
