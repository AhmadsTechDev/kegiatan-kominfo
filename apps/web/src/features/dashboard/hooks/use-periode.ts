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
