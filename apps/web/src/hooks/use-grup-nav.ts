"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { navAktif, navUntukRole } from "@/config/navigation";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";

// Label kecil di atas judul halaman mengikuti grup menu, yang berbeda per role

export function useGrupNav(cadangan: string) {
  const { user } = useCurrentUser();
  const aktif = navAktif(navUntukRole(user?.role), usePathname(), useSearchParams());
  return aktif?.group.label ?? cadangan;
}
