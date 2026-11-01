// =============================================================================
// HALAMAN AKTIVASI AKUN PENGGUNA
// =============================================================================
// Gunanya: Menampilkan formulir penetapan kata sandi perdana bagi pengguna baru
// melalui tautan aktivasi ber-token pada Aplikasi Pendataan Kegiatan.
//
// Isi berkas:
//   - metadata     : judul tab peramban untuk halaman aktivasi akun
//   - AktivasiPage : komponen halaman yang menyusun AuthShell, KartuPublik, dan form
//
// Catatan penting:
//   - Formulir dibungkus Suspense karena token verifikasi dibaca dari query URL.
//
// Dipakai oleh: Next.js App Router untuk rute /aktivasi
// =============================================================================

import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AktivasiForm } from "@/features/auth/components/aktivasi-form";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { KartuPublik } from "@/features/auth/components/kartu-publik";

export const metadata: Metadata = { title: "Aktivasi akun" };

export default function AktivasiPage() {
  return (
    <AuthShell>
      <KartuPublik eyebrow="Aktivasi akun" judul="Buat kata sandi" deskripsi="Langkah terakhir sebelum Anda dapat masuk ke aplikasi.">
        <Suspense fallback={<Skeleton className="h-72 w-full rounded-xl" />}>
          <AktivasiForm />
        </Suspense>
      </KartuPublik>
    </AuthShell>
  );
}
