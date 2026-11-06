"use client";

import { useSyncExternalStore } from "react";

// Periode bulan berjalan "YYYY-MM" menurut WIB

const OFFSET_WIB_MS = 7 * 60 * 60 * 1000;

const subscribe = () => () => {};

function kodeSekarang() {
  return new Date(Date.now() + OFFSET_WIB_MS).toISOString().slice(0, 7);
}

export function usePeriodeSekarang() {
  return useSyncExternalStore(subscribe, kodeSekarang, () => null);
}

