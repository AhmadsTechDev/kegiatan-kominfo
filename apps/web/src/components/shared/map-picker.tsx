// =============================================================================
// PEMBUNGKUS DINAMIS PEMILIH LOKASI PETA
// =============================================================================
// Gunanya: Memuat modul pemilih lokasi peta MapPickerInner secara dinamis di sisi
//          klien tanpa SSR untuk mencegah galat window/WebGL di server.
//
// Isi berkas:
//   - MapPicker : pembungkus dynamic Next.js dengan kerangka skeleton pemuatan
//
// Catatan penting:
//   - Sesuai DESIGN.md bagian 6, SSR dimatikan (ssr: false) untuk MapLibre GL.
//
// Dipakai oleh: Formulir kegiatan (lokasi-kegiatan.tsx) dan tampilan detail kegiatan
// =============================================================================

"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

export type { Koordinat } from "./map-picker-inner";

export const MapPicker = dynamic(() => import("./map-picker-inner"), {
  ssr: false,
  loading: () => <Skeleton className="h-72 w-full rounded-xl" />,
});
