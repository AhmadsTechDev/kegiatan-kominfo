// =============================================================================
// HOOK LAYAR SENTUH
// =============================================================================
// Gunanya: Mendeteksi perangkat dengan penunjuk kasar (jari) agar grafik bisa
// memakai perilaku khusus sentuh, mis. tooltip hanya muncul saat diketuk.
//
// Isi berkas:
//   - useLayarSentuh : hook langganan media query (pointer: coarse).
//   - redamGeserGrafik : props untuk pembungkus grafik agar geseran jari
//     (menggulir halaman) tidak mengaktifkan tooltip Recharts.
//
// Catatan penting:
//   - Memakai useSyncExternalStore: bernilai false di server dan sinkron di peramban.
//   - Geseran hanya dihentikan propagasinya (bukan preventDefault), jadi halaman
//     tetap bisa digulir seperti biasa.
//
// Dipakai oleh: chart-unit-bulanan.tsx dan tren-rekap.tsx.
// =============================================================================

"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(pointer: coarse)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

export function useLayarSentuh() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}

// Recharts mengaktifkan tooltip pada touchstart/touchmove. Di layar sentuh event itu
// dihentikan sebelum sampai ke grafik; tooltip dibuka lewat ketukan (trigger "click").
const henti = (e: React.TouchEvent) => e.stopPropagation();
export const redamGeserGrafik = { onTouchStartCapture: henti, onTouchMoveCapture: henti };
