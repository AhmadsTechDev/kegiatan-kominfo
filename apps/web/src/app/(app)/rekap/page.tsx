// =============================================================================
// HALAMAN REKAPITULASI DAN EKSPOR DATA KEGIATAN
// =============================================================================
// Gunanya: Menampilkan rekapitulasi agregasi kegiatan dinas dan menyediakan opsi
// ekspor berkas data kegiatan pada Aplikasi Pendataan Kegiatan.
//
// Isi berkas:
//   - metadata  : judul tab peramban untuk rute rekapitulasi kegiatan
//   - RekapPage : komponen utama yang merender RekapView di dalam batas Suspense
//
// Catatan penting:
//   - Memakai Suspense untuk mencegah kegagalan SSR saat membaca query filter URL.
//
// Dipakai oleh: Next.js App Router untuk rute /rekap
// =============================================================================

import type { Metadata } from "next";
import { Suspense } from "react";
import { RekapView } from "@/features/rekap/components/rekap-view";

export const metadata: Metadata = { title: "Rekap kegiatan" };

export default function RekapPage() {
  return (
    <Suspense>
      <RekapView />
    </Suspense>
  );
}
