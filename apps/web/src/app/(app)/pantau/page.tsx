// =============================================================================
// HALAMAN PANTAU PIMPINAN
// =============================================================================
// Gunanya: Menyediakan dasbor pemantauan ringkas bagi pimpinan dan admin untuk
// meninjau progres kegiatan dinas secara menyeluruh di Aplikasi Pendataan Kegiatan.
//
// Isi berkas:
//   - metadata   : judul tab peramban untuk halaman pemantauan pimpinan
//   - PantauPage : komponen utama halaman yang merender tampilan PantauView
//
// Catatan penting:
//   - Halaman khusus pimpinan dan admin sesuai spesifikasi fitur pemantauan.
//
// Dipakai oleh: Next.js App Router untuk rute /pantau
// =============================================================================

import type { Metadata } from "next";
import { Suspense } from "react";
import { PantauView } from "@/features/pantau/components/pantau-view";

export const metadata: Metadata = { title: "Pantau" };

export default function PantauPage() {
  // Suspense: label menu (eyebrow) dibaca dari URL lewat useSearchParams
  return (
    <Suspense>
      <PantauView />
    </Suspense>
  );
}
