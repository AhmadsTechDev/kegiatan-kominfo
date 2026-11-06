"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { login } from "../api/login";

/**
 * Mutasi login, lalu arahkan ke ?next= yang aman atau ke dashboard
 */

/**
 * KONSEP open redirect: penyerang bisa membuat tautan login berisi ?next=//situs-jahat.com agar korban dialihkan
 * ke situs palsu setelah login. Karena itu hanya alamat internal (diawali satu "/") yang diterima.
 */
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

      /**
       * router.refresh memuat ulang data halaman dari server agar tampilan langsung mengikuti sesi yang baru.
       */
      router.refresh();
    },
  });
}
