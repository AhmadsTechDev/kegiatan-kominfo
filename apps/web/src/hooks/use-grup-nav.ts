// =============================================================================
// HOOK LABEL KELOMPOK MENU AKTIF
// =============================================================================
// Gunanya: Label kecil di atas judul halaman (eyebrow) mengikuti kelompok menu
// tempat halaman itu berada, karena kelompoknya berbeda per role
// (Pegawai: "Kegiatan", Pimpinan: "Monitoring", Admin: "Operasional").
//
// Dipakai oleh: kegiatan-list-view.tsx, kalender-view.tsx
// =============================================================================

"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { navAktif, navUntukRole } from "@/config/navigation";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";

export function useGrupNav(cadangan: string) {
  const { user } = useCurrentUser();
  const aktif = navAktif(navUntukRole(user?.role), usePathname(), useSearchParams());
  return aktif?.group.label ?? cadangan;
}
