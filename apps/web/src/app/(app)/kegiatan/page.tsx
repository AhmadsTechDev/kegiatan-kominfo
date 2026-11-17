import type { Metadata } from "next";
import { Suspense } from "react";
import { DataTableSkeleton } from "@/components/common/data-table";
import { KegiatanListView } from "@/features/kegiatan/components/kegiatan-list-view";

export const metadata: Metadata = { title: "Kegiatan" };

export default function KegiatanPage() {
  return (
    <Suspense fallback={<DataTableSkeleton rows={8} />}>
      <KegiatanListView />
    </Suspense>
  );
}
