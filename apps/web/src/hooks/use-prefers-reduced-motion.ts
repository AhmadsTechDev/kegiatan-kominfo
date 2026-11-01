// =============================================================================
// HOOK PREFERENSI KURANGI GERAK
// =============================================================================
// Gunanya: Mendeteksi preferensi aksesibilitas "kurangi gerak" dari sistem operasi
// pengguna agar animasi berat berbasis JavaScript dapat dinonaktifkan.
//
// Isi berkas:
//   - usePrefersReducedMotion : hook langganan media query prefers-reduced-motion.
//
// Catatan penting:
//   - Memakai useSyncExternalStore: bernilai false di server dan sinkron di peramban.
//   - Diperlukan untuk logika animasi JavaScript yang tidak terjangkau CSS global.
//
// Dipakai oleh: use-animasi-pertama.ts dan use-count-up.ts.
// =============================================================================

"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
