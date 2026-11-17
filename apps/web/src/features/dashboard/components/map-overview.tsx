"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

export type { TitikPeta } from "./map-overview-inner";

export const MapOverview = dynamic(() => import("./map-overview-inner"), {
  ssr: false,
  loading: () => <Skeleton className="h-90 w-full rounded-xl" />,
});
