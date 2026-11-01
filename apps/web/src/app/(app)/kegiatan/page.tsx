// =============================================================================
// HALAMAN DAFTAR KEGIATAN DINAS
// =============================================================================
// Gunanya: Menampilkan tabel daftar kegiatan dinas yang dilengkapi fitur pencarian,
// penyaringan status/unit/periode, dan menu aksi di Aplikasi Pendataan Kegiatan.
//
// Isi berkas:
//   - metadata     : judul tab peramban untuk rute daftar kegiatan
//   - KegiatanPage : komponen utama halaman yang merender tabel di dalam Suspense
//
// Catatan penting:
//   - Memakai Suspense dan DataTableSkeleton karena filter dibaca via query string.
//
// Dipakai oleh: Next.js App Router untuk rute /kegiatan
// =============================================================================

import type { Metadata } from "next";
import { Suspense } from "react";
import { DataTableSkeleton } from "@/components/shared/data-table";
import { KegiatanListView } from "@/features/kegiatan/components/kegiatan-list-view";

export const metadata: Metadata = { title: "Kegiatan" };

export default function KegiatanPage() {
  return (
    <Suspense fallback={<DataTableSkeleton rows={8} />}>
      <KegiatanListView />
    </Suspense>
  );
}
