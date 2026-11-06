import type { Metadata } from "next";
import { Suspense } from "react";
import { KalenderView } from "@/features/kalender/components/kalender-view";

/**
 * Halaman kalender kegiatan bulanan (/kalender)
 */

export const metadata: Metadata = { title: "Kalender kegiatan" };

export default function KalenderPage() {
  return (
    <Suspense>
      <KalenderView />
    </Suspense>
  );
}
