// =============================================================================
// HALAMAN RINCIAN DETAIL KEGIATAN
// =============================================================================
// Gunanya: Menampilkan informasi lengkap suatu kegiatan berdasarkan parameter ID
// rute URL dinamis pada Aplikasi Pendataan Kegiatan.
//
// Isi berkas:
//   - metadata           : judul tab peramban untuk halaman detail kegiatan
//   - Props              : tipe parameter rute dinamis berupa Promise<{ id: string }>
//   - Isi                : fungsi asinkron pengurai ID untuk KegiatanDetailView
//   - KegiatanDetailPage : komponen utama dengan pembungkus Suspense dan skeleton
//
// Cara kerja:
//   1. Menunggu penyelesaian Promise parameter dinamis rute URL.
//   2. Mengonversi teks ID menjadi angka untuk diteruskan ke KegiatanDetailView.
//
// Catatan penting:
//   - Parameter dibaca di dalam batas Suspense agar mendukung rendering runtime.
//
// Dipakai oleh: Next.js App Router untuk rute /kegiatan/[id]
// =============================================================================

import type { Metadata } from "next";
import { Suspense } from "react";
import { KegiatanDetailView } from "@/features/kegiatan/components/kegiatan-detail-view";
import { KegiatanDetailSkeleton } from "@/features/kegiatan/components/kegiatan-states";

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
