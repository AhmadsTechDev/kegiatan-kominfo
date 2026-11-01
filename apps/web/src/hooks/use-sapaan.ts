// =============================================================================
// HOOK SAPAAN WAKTU WIB
// =============================================================================
// Gunanya: Menghasilkan teks sapaan ramah (pagi, siang, sore, malam) sesuai jam
// zona Waktu Indonesia Barat (WIB) tanpa memicu ketidakcocokan hidrasi SSR.
//
// Isi berkas:
//   - useSapaan : hook penyedia teks sapaan berbasis useSyncExternalStore.
//
// Catatan penting:
//   - Jam dihitung dalam WIB (+7 UTC), bukan waktu lokal perangkat pengguna.
//   - Mengembalikan nilai netral "Selamat datang" saat prerender server.
//
// Dipakai oleh: dashboard-view.tsx dan dashboard-pegawai.tsx.
// =============================================================================

"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

function sapaanSekarang() {
  const jam = new Date(Date.now() + 7 * 60 * 60 * 1000).getUTCHours();
  if (jam < 11) return "Selamat pagi";
  if (jam < 15) return "Selamat siang";
  if (jam < 19) return "Selamat sore";
  return "Selamat malam";
}

export function useSapaan() {
  return useSyncExternalStore(subscribe, sapaanSekarang, () => "Selamat datang");
}
