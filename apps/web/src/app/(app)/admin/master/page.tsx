import type { Metadata } from "next";
import { Suspense } from "react";
import { MasterView } from "@/features/admin/components/master-view";

// Halaman master data: pegawai, bidang, dan jenis kegiatan (/admin/master)

export const metadata: Metadata = { title: "Master data" };

export default function MasterPage() {
  return (
    <Suspense>
      <MasterView />
    </Suspense>
  );
}
