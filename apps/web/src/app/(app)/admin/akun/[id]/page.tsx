import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AkunDetailView } from "@/features/admin/components/akun-detail-view";

// Halaman detail satu akun untuk admin (/admin/akun/[id])

export const metadata: Metadata = { title: "Detail akun" };

type Props = { params: Promise<{ id: string }> };

async function Isi({ params }: Props) {
  const { id } = await params;
  return <AkunDetailView id={id} />;
}

export default function AkunDetailPage({ params }: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
      <Isi params={params} />
    </Suspense>
  );
}
