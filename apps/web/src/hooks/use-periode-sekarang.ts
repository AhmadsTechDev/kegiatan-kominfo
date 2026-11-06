"use client";

import { useSyncExternalStore } from "react";

/**
 * Periode bulan berjalan "YYYY-MM" menurut WIB
 */

const OFFSET_WIB_MS = 7 * 60 * 60 * 1000;

const subscribe = () => () => {};

function kodeSekarang() {
  return new Date(Date.now() + OFFSET_WIB_MS).toISOString().slice(0, 7);
}

/**
 * subscribe yang kosong berarti nilainya tidak dipantau perubahannya; useSyncExternalStore dipakai agar
 * di server bernilai null dan di peramban bernilai bulan sekarang, tanpa galat hidrasi.
 * KONSEP hidrasi: HTML dari server "dihidupkan" oleh React di peramban; isinya harus sama, kalau tidak muncul galat.
 * @returns "YYYY-MM" bulan berjalan menurut WIB, atau null saat render di server
 */
export function usePeriodeSekarang() {
  return useSyncExternalStore(subscribe, kodeSekarang, () => null);
}

