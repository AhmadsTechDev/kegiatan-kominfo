// =============================================================================
// HALAMAN VERIFIKASI EMAIL BARU
// =============================================================================
// Gunanya: Menyelesaikan perubahan email akun dari tautan yang dikirim ke email baru.
//
// Isi berkas:
//   - metadata            : judul tab peramban
//   - KonfirmasiEmailPage : AuthShell + KartuPublik berisi KonfirmasiEmailView
//
// Catatan penting:
//   - Bisa dibuka dengan atau tanpa login; token di URL sudah cukup sebagai bukti.
//
// Dipakai oleh: Next.js App Router untuk rute /konfirmasi-email
// =============================================================================

import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { KartuPublik } from "@/features/auth/components/kartu-publik";
import { KonfirmasiEmailView } from "@/features/auth/components/konfirmasi-email-view";

export const metadata: Metadata = { title: "Verifikasi email" };

export default function KonfirmasiEmailPage() {
  return (
    <AuthShell>
      <KartuPublik eyebrow="Pengaturan akun" judul="Verifikasi email baru">
        <Suspense fallback={<Skeleton className="h-32 w-full rounded-xl" />}>
          <KonfirmasiEmailView />
        </Suspense>
      </KartuPublik>
    </AuthShell>
  );
}
