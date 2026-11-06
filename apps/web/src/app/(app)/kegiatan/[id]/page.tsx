import type { Metadata } from "next";
import { Suspense } from "react";
import { KegiatanDetailView } from "@/features/kegiatan/components/kegiatan-detail-view";
import { KegiatanDetailSkeleton } from "@/features/kegiatan/components/kegiatan-states";

/**
 * Halaman detail kegiatan (/kegiatan/[id])
 */

export const metadata: Metadata = { title: "Detail kegiatan" };

type Props = { params: Promise<{ id: string }> };

async function Isi({ params }: Props) {
  const { id } = await params;
  return <KegiatanDetailView id={Number(id)} />;
}

export default function KegiatanDetailPage({ params }: Props) {
  return (
    <Suspense fallback={<KegiatanDetailSkeleton />}>
      <Isi params={params} />
    </Suspense>
  );
}
