"use client";

import { useCallback, useSyncExternalStore } from "react";

const henti = (e: React.TouchEvent) => e.stopPropagation();

export const redamGeserGrafik = { onTouchStartCapture: henti, onTouchMoveCapture: henti };

export function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export function useLayarSentuh() {
  return useMediaQuery("(pointer: coarse)");
}

export function usePrefersReducedMotion() {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

