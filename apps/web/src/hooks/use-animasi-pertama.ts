"use client";

import { useState } from "react";
import { usePrefersReducedMotion } from "./use-prefers-reduced-motion";

/**
 * Animasi hanya diputar saat data pertama dimuat, tidak saat filter/periode diganti
 */

/**
 * KONSEP custom hook: fungsi berawalan "use" yang membungkus logika React agar bisa dipakai ulang di banyak komponen.
 * Data pertama yang datang disimpan di state; animasi hanya berjalan selama data yang tampil masih data pertama itu.
 * Mengubah state langsung saat render (bukan di useEffect) adalah pola React yang sah untuk kasus seperti ini.
 * @param data data dari TanStack Query (undefined saat masih dimuat)
 * @returns true bila animasi boleh diputar
 */
export function useAnimasiPertama<T>(data: T | undefined) {
  const kurangiGerak = usePrefersReducedMotion();
  const [dataPertama, setDataPertama] = useState<T | undefined>(undefined);
  if (data !== undefined && dataPertama === undefined) setDataPertama(data);
  return !kurangiGerak && data !== undefined && (dataPertama === undefined || data === dataPertama);
}

