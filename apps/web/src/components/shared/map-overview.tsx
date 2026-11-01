// =============================================================================
// PEMBUNGKUS DINAMIS PETA SEBARAN
// =============================================================================
// Gunanya: Memuat peta sebaran kegiatan secara dinamis di klien tanpa SSR untuk
//          mencegah galat objek browser (window dan WebGL) di lingkungan server.
//
// Isi berkas:
//   - MapOverview : pembungkus dynamic import Next.js dengan fallback skeleton
//
// Catatan penting:
//   - Mengikuti DESIGN.md bagian 6 dengan mematikan SSR (ssr: false) untuk MapLibre.
//
// Dipakai oleh: Komponen peta dashboard (peta-kegiatan.tsx)
// =============================================================================

"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

export type { TitikPeta } from "./map-overview-inner";

export const MapOverview = dynamic(() => import("./map-overview-inner"), {
  ssr: false,
  loading: () => <Skeleton className="h-90 w-full rounded-xl" />,
});
