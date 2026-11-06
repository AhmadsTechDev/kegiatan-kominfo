"use client";

import { useSyncExternalStore } from "react";

/**
 * Deteksi layar sentuh agar grafik bisa berperilaku khusus (mis. tooltip saat diketuk)
 */

const QUERY = "(pointer: coarse)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/**
 * KONSEP useSyncExternalStore: cara resmi React membaca nilai dari luar React (di sini media query peramban)
 * dan ikut memperbarui komponen bila nilainya berubah. Argumen ketiga adalah nilai saat render di server,
 * yang tidak punya layar, jadi selalu false.
 * @returns true bila perangkat utamanya layar sentuh
 */
export function useLayarSentuh() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}

/**
 * Recharts mengaktifkan tooltip pada touchstart/touchmove. Di layar sentuh event itu
 * dihentikan sebelum sampai ke grafik; tooltip dibuka lewat ketukan (trigger "click").
 */
const henti = (e: React.TouchEvent) => e.stopPropagation();
export const redamGeserGrafik = { onTouchStartCapture: henti, onTouchMoveCapture: henti };
