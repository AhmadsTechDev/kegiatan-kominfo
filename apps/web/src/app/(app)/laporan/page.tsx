import type { Metadata } from "next";
import { Suspense } from "react";
import { LaporanView } from "@/features/laporan/components/laporan-view";

export const metadata: Metadata = { title: "Cetak & unduh laporan" };

export default function LaporanPage() {
  return (
    <Suspense>
      <LaporanView />
    </Suspense>
  );
}
