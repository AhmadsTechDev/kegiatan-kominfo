import type { Metadata } from "next";
import { Suspense } from "react";
import { DataTableSkeleton } from "@/components/shared/data-table";
import { KegiatanListView } from "@/features/kegiatan/components/kegiatan-list-view";

/**
 * Halaman daftar kegiatan (/kegiatan)
 */

export const metadata: Metadata = { title: "Kegiatan" };

export default function KegiatanPage() {
  return (
    <Suspense fallback={<DataTableSkeleton rows={8} />}>
      <KegiatanListView />
    </Suspense>
  );
}
