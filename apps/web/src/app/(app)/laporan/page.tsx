// =============================================================================
// HALAMAN CETAK DAN UNDUH LAPORAN
// =============================================================================
// Gunanya: Menyediakan antarmuka penyusunan, pencetakan, dan pengunduhan berkas
// laporan kegiatan dinas berdasarkan rentang tanggal di Aplikasi Pendataan Kegiatan.
//
// Isi berkas:
//   - metadata    : konfigurasi judul tab peramban untuk halaman laporan
//   - LaporanPage : komponen utama yang menampilkan antarmuka LaporanView
//
// Catatan penting:
//   - Menggunakan Suspense karena pilihan rentang dan cakupan dibaca dari URL.
//
// Dipakai oleh: Next.js App Router untuk rute /laporan
// =============================================================================

import type { Metadata } from "next";
import { Suspense } from "react";
import { LaporanView } from "@/features/laporan/components/laporan-view";

export const metadata: Metadata = { title: "Cetak & unduh laporan" };

export default function LaporanPage() {
  return (
    <Suspense>
      <LaporanView />
    </Suspense>
  );
}
