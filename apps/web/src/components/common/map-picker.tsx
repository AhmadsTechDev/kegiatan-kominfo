"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Memuat peta pemilih lokasi hanya di klien (tanpa SSR) karena butuh window/WebGL
 */

export type { Koordinat } from "./map-picker-inner";

export const MapPicker = dynamic(() => import("./map-picker-inner"), {
  ssr: false,
  loading: () => <Skeleton className="h-72 w-full rounded-xl" />,
});
