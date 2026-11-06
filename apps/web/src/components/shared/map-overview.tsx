"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

// Memuat peta sebaran hanya di klien (tanpa SSR) karena butuh window/WebGL

export type { TitikPeta } from "./map-overview-inner";

export const MapOverview = dynamic(() => import("./map-overview-inner"), {
  ssr: false,
  loading: () => <Skeleton className="h-90 w-full rounded-xl" />,
});
