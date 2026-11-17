"use client";

import { useState } from "react";
import { usePrefersReducedMotion } from "./use-media-query";

export function useAnimasiPertama<T>(data: T | undefined) {
  const kurangiGerak = usePrefersReducedMotion();
  const [dataPertama, setDataPertama] = useState<T | undefined>(undefined);
  if (data !== undefined && dataPertama === undefined) setDataPertama(data);
  return !kurangiGerak && data !== undefined && (dataPertama === undefined || data === dataPertama);
}

