// =============================================================================
// HOOK MUTASI LOGIN (useLogin)
// =============================================================================
// Gunanya: Menjalankan mutasi masuk pengguna via TanStack Query, lalu mengalihkan rute
// ke dashboard atau parameter URL tujuan aman (?next=) setelah autentikasi berhasil.
//
// Isi berkas:
//   - tujuanAman : memvalidasi path pengalihan internal untuk mencegah celah open redirect
//   - useLogin   : hook mutasi login, navigasi router.replace, dan refresh komponen server
//
// Dipakai oleh: LoginForm (frontend/src/features/auth/components/login-form.tsx)
// =============================================================================

"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { login } from "../api/login";

function tujuanAman(next: string | null) {
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return "/dashboard";
}

export function useLogin() {
  const router = useRouter();

  return useMutation({
    mutationFn: login,
    onSuccess: () => {
      const next = new URLSearchParams(window.location.search).get("next");
      router.replace(tujuanAman(next));
      router.refresh();
    },
  });
}
