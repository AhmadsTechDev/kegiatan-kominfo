// =============================================================================
// HOOK PENGELOLA PERIODE DASHBOARD
// =============================================================================
// Gunanya: Membaca dan memperbarui query URL (?periode=YYYY-MM) secara reaktif
// tanpa memuat ulang halaman agar pilihan periode bertahan saat tautan dibagikan.
//
// Isi berkas:
//   - usePeriode : Hook pembaca dan pembaru query URL dengan opsi scroll: false.
//
// Dipakai oleh: features/dashboard/components/dashboard-view.tsx
// =============================================================================

"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export function usePeriode() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const periode = searchParams.get("periode");

  const setPeriode = useCallback(
    (nilai: string) => {
      const params = new URLSearchParams(searchParams);
      params.set("periode", nilai);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return { periode, setPeriode };
}
