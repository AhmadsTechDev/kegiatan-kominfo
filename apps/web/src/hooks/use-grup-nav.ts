"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { navAktif, navUntukRole } from "@/config/navigation";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";

export function useGrupNav(cadangan: string) {
  const { user } = useCurrentUser();
  const aktif = navAktif(navUntukRole(user?.role), usePathname(), useSearchParams());
  return aktif?.group.label ?? cadangan;
}
