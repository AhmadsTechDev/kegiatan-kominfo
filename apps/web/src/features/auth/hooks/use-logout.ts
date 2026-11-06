"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { authClient } from "@/lib/auth-client";

// Keluar akun, hapus cache TanStack Query, lalu ke halaman login

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
