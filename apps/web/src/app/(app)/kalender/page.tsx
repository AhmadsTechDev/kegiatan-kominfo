// =============================================================================
// HALAMAN KALENDER JADWAL KEGIATAN
// =============================================================================
// Gunanya: Menampilkan jadwal pelaksanaan kegiatan dinas dalam tampilan kalender
// bulanan interaktif pada Aplikasi Pendataan Kegiatan.
//
// Isi berkas:
//   - metadata     : judul tab peramban untuk rute kalender kegiatan
//   - KalenderPage : komponen utama yang merender KalenderView di dalam Suspense
//
// Catatan penting:
//   - Dibungkus Suspense karena filter bulan (?bulan=YYYY-MM) dibaca via URL.
//
// Dipakai oleh: Next.js App Router untuk rute /kalender
// =============================================================================

import type { Metadata } from "next";
import { Suspense } from "react";
import { KalenderView } from "@/features/kalender/components/kalender-view";

export const metadata: Metadata = { title: "Kalender kegiatan" };

export default function KalenderPage() {
  return (
    <Suspense>
      <KalenderView />
    </Suspense>
  );
}
