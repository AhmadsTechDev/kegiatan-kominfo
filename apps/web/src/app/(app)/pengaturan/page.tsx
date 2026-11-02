// =============================================================================
// HALAMAN PENGATURAN PENGGUNA
// =============================================================================
// Gunanya: Menyediakan antarmuka bagi pengguna Aplikasi Pendataan Kegiatan untuk
// mengelola profil pribadi, mengganti kata sandi, serta memilih tema tampilan.
//
// Isi berkas:
//   - metadata       : konfigurasi judul tab peramban untuk rute pengaturan
//   - PengaturanPage : komponen utama halaman yang merender tampilan PengaturanView
//
// Dipakai oleh: Next.js App Router untuk rute /pengaturan
// =============================================================================

import type { Metadata } from "next";
import { Suspense } from "react";
import { PengaturanView } from "@/features/pengaturan/components/pengaturan-view";

export const metadata: Metadata = { title: "Pengaturan" };

export default function PengaturanPage() {
  return (
    <Suspense>
      <PengaturanView />
    </Suspense>
  );
}
