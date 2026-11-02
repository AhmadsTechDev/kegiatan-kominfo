// =============================================================================
// HALAMAN ATUR ULANG KATA SANDI
// =============================================================================
// Gunanya: Membuat kata sandi baru dari tautan atur ulang yang dikirim ke email.
//
// Isi berkas:
//   - metadata       : judul tab peramban
//   - ResetSandiPage : AuthShell + KartuPublik berisi ResetSandiForm
//
// Catatan penting:
//   - Formulir dibungkus Suspense karena token dibaca dari query URL.
//
// Dipakai oleh: Next.js App Router untuk rute /reset-sandi
// =============================================================================

import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { KartuPublik } from "@/features/auth/components/kartu-publik";
import { ResetSandiForm } from "@/features/auth/components/reset-sandi-form";

export const metadata: Metadata = { title: "Atur ulang kata sandi" };

export default function ResetSandiPage() {
  return (
    <AuthShell>
      <KartuPublik eyebrow="Pemulihan akun" judul="Buat kata sandi baru">
        <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
          <ResetSandiForm />
        </Suspense>
      </KartuPublik>
    </AuthShell>
  );
}
