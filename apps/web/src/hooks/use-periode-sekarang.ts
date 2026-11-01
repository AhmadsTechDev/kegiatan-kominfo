// =============================================================================
// HOOK PERIODE BULAN BERJALAN WIB
// =============================================================================
// Gunanya: Menyediakan kode periode bulan berjalan dalam format string "YYYY-MM"
// berdasarkan zona Waktu Indonesia Barat (WIB / UTC+7).
//
// Isi berkas:
//   - usePeriodeSekarang : hook pembaca periode aktif yang aman dari mismatch hidrasi.
//
// Catatan penting:
//   - Menggunakan useSyncExternalStore dan mengembalikan null saat SSR agar Next.js
//     tidak mengalami kesalahan hidrasi akibat pemanggilan waktu saat prerender.
//
// Dipakai oleh: filter-bar.tsx sebagai nilai pilihan default filter periode.
// =============================================================================

"use client";

import { useSyncExternalStore } from "react";

const OFFSET_WIB_MS = 7 * 60 * 60 * 1000;

const subscribe = () => () => {};

function kodeSekarang() {
  return new Date(Date.now() + OFFSET_WIB_MS).toISOString().slice(0, 7);
}

export function usePeriodeSekarang() {
  return useSyncExternalStore(subscribe, kodeSekarang, () => null);
}

