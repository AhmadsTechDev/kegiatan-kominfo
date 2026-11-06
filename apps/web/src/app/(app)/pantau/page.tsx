import type { Metadata } from "next";
import { Suspense } from "react";
import { PantauView } from "@/features/pantau/components/pantau-view";

// Halaman pemantauan kegiatan untuk pimpinan dan admin (/pantau)

export const metadata: Metadata = { title: "Pantau" };

export default function PantauPage() {
  // Suspense: label menu (eyebrow) dibaca dari URL lewat useSearchParams
  return (
    <Suspense>
      <PantauView />
    </Suspense>
  );
}
