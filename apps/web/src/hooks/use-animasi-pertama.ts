// =============================================================================
// HOOK DETEKSI ANIMASI PEMUATAN PERTAMA
// =============================================================================
// Gunanya: Menentukan apakah komponen visual boleh memutar animasi saat pertama
// kali data dimuat tanpa mengulangnya saat filter/periode diganti (DESIGN.md 8.2).
//
// Isi berkas:
//   - useAnimasiPertama : hook generic pendeteksi pemuatan awal data tampilan.
//
// Catatan penting:
//   - Menghormati preferensi kurangi gerak (prefers-reduced-motion) sistem operasi.
//   - Menggunakan pola penyimpanan state render sebelumnya tanpa useEffect.
//
// Dipakai oleh: dashboard-view.tsx dan rekap-view.tsx.
// =============================================================================

"use client";

import { useState } from "react";
import { usePrefersReducedMotion } from "./use-prefers-reduced-motion";

export function useAnimasiPertama<T>(data: T | undefined) {
  const kurangiGerak = usePrefersReducedMotion();
  const [dataPertama, setDataPertama] = useState<T | undefined>(undefined);
  if (data !== undefined && dataPertama === undefined) setDataPertama(data);
  return !kurangiGerak && data !== undefined && (dataPertama === undefined || data === dataPertama);
}

