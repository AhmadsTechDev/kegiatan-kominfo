// =============================================================================
// HALAMAN MANAJEMEN AKUN PENGGUNA
// =============================================================================
// Gunanya: Menampilkan halaman manajemen akun di Aplikasi Pendataan Kegiatan bagi
// admin untuk mengelola status akun, reset kata sandi, dan persetujuan akun baru.
//
// Isi berkas:
//   - metadata : judul tab peramban untuk rute manajemen akun
//   - AkunPage : komponen utama halaman yang merender AkunView di dalam Suspense
//
// Catatan penting:
//   - AkunView dibungkus Suspense karena tab aktif dibaca dari query string URL.
//
// Dipakai oleh: Next.js App Router untuk rute /admin/akun
// =============================================================================

import type { Metadata } from "next";
import { Suspense } from "react";
import { AkunView } from "@/features/admin/components/akun-view";

export const metadata: Metadata = { title: "Manajemen akun" };

export default function AkunPage() {
  return (
    <Suspense>
      <AkunView />
    </Suspense>
  );
}
