"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Memuat peta sebaran hanya di klien (tanpa SSR) karena butuh window/WebGL
 */

export type { TitikPeta } from "./map-overview-inner";

/**
 * KONSEP dynamic import: komponen peta baru diunduh saat dibutuhkan (code splitting), sehingga halaman lain
 * tidak ikut memuat library peta yang besar. ssr: false karena MapLibre butuh `window` dan WebGL yang hanya ada
 * di peramban; selama dimuat, skeleton ditampilkan.
 */
export const MapOverview = dynamic(() => import("./map-overview-inner"), {
  ssr: false,
  loading: () => <Skeleton className="h-90 w-full rounded-xl" />,
});
