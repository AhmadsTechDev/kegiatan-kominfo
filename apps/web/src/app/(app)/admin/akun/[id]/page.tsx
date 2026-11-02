// =============================================================================
// HALAMAN DETAIL AKUN (ADMIN)
// =============================================================================
// Gunanya: Rute /admin/akun/[id] yang menampilkan detail satu akun untuk administrator.
//
// Isi berkas:
//   - metadata        : judul tab peramban
//   - AkunDetailPage  : membaca id dari params lalu merender AkunDetailView
//
// Catatan penting:
//   - Hak akses tetap diperiksa backend (403 untuk selain ADMIN); AdminGuard hanya untuk tampilan.
//
// Dipakai oleh: Next.js App Router untuk rute /admin/akun/[id]
// =============================================================================

import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AkunDetailView } from "@/features/admin/components/akun-detail-view";

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
