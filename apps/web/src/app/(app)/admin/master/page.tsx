// =============================================================================
// HALAMAN PENGELOLAAN DATA MASTER
// =============================================================================
// Gunanya: Menyediakan antarmuka bagi admin untuk mengelola referensi data master
// seperti data pegawai, bidang, dan jenis kegiatan pada Aplikasi Pendataan Kegiatan.
//
// Isi berkas:
//   - metadata   : judul tab peramban untuk rute master data
//   - MasterPage : komponen halaman yang merender MasterView di dalam Suspense
//
// Catatan penting:
//   - Memakai Suspense karena tab aktif dibaca langsung dari query string URL.
//
// Dipakai oleh: Next.js App Router untuk rute /admin/master
// =============================================================================

import type { Metadata } from "next";
import { Suspense } from "react";
import { MasterView } from "@/features/admin/components/master-view";

export const metadata: Metadata = { title: "Master data" };

export default function MasterPage() {
  return (
    <Suspense>
      <MasterView />
    </Suspense>
  );
}
