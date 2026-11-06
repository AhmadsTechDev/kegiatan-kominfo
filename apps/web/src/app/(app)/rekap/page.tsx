import type { Metadata } from "next";
import { Suspense } from "react";
import { RekapView } from "@/features/rekap/components/rekap-view";

// Halaman rekapitulasi kegiatan (/rekap)

export const metadata: Metadata = { title: "Rekap kegiatan" };

export default function RekapPage() {
  return (
    <Suspense>
      <RekapView />
    </Suspense>
  );
}
