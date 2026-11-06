"use client";

import { useSyncExternalStore } from "react";

// Deteksi layar sentuh agar grafik bisa berperilaku khusus (mis. tooltip saat diketuk)

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
