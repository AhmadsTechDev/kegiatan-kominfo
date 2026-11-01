// =============================================================================
// HALAMAN DASHBOARD UTAMA
// =============================================================================
// Gunanya: Menampilkan ringkasan statistik kegiatan dinas, anggaran, capaian,
// serta visualisasi grafik data pada Aplikasi Pendataan Kegiatan.
//
// Isi berkas:
//   - metadata      : judul tab peramban untuk halaman dashboard
//   - DashboardPage : Server Component perender DashboardView dengan fallback skeleton
//
// Catatan penting:
//   - Menggunakan Suspense dan DashboardSkeleton saat parameter periode dimuat.
//
// Dipakai oleh: Next.js App Router untuk rute /dashboard
// =============================================================================

import type { Metadata } from "next";
import { Suspense } from "react";
import { DashboardSkeleton } from "@/features/dashboard/components/dashboard-skeleton";
import { DashboardView } from "@/features/dashboard/components/dashboard-view";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardView />
    </Suspense>
  );
}
