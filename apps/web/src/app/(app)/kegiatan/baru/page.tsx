import type { Metadata } from "next";
import { Suspense } from "react";
import { KegiatanFormSkeleton } from "@/features/kegiatan/components/kegiatan-states";
import { KegiatanBaruView } from "@/features/kegiatan/components/kegiatan-form-view";

// Halaman catat kegiatan baru, termasuk melanjutkan draf (/kegiatan/baru)

export const metadata: Metadata = { title: "Tambah kegiatan" };

type Props = { searchParams: Promise<{ draf?: string }> };

async function Isi({ searchParams }: Props) {
  const { draf } = await searchParams;
  return <KegiatanBaruView drafId={draf ? Number(draf) : null} />;
}

export default function KegiatanBaruPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<KegiatanFormSkeleton />}>
      <Isi searchParams={searchParams} />
    </Suspense>
  );
}
