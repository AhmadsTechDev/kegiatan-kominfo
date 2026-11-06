import type { Metadata } from "next";
import { Suspense } from "react";
import { KegiatanUbahView } from "@/features/kegiatan/components/kegiatan-form-view";
import { KegiatanFormSkeleton } from "@/features/kegiatan/components/kegiatan-states";

/**
 * Halaman ubah kegiatan (/kegiatan/[id]/ubah)
 */

export const metadata: Metadata = { title: "Ubah kegiatan" };

type Props = { params: Promise<{ id: string }> };

async function Isi({ params }: Props) {
  const { id } = await params;
  return <KegiatanUbahView id={Number(id)} />;
}

export default function KegiatanUbahPage({ params }: Props) {
  return (
    <Suspense fallback={<KegiatanFormSkeleton />}>
      <Isi params={params} />
    </Suspense>
  );
}
