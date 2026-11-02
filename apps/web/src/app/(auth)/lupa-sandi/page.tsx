// =============================================================================
// HALAMAN LUPA KATA SANDI
// =============================================================================
// Gunanya: Meminta tautan atur ulang kata sandi lewat email pribadi akun.
//
// Isi berkas:
//   - metadata      : judul tab peramban
//   - LupaSandiPage : AuthShell + KartuPublik berisi LupaSandiForm
//
// Dipakai oleh: Next.js App Router untuk rute /lupa-sandi
// =============================================================================

import type { Metadata } from "next";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { KartuPublik } from "@/features/auth/components/kartu-publik";
import { LupaSandiForm } from "@/features/auth/components/reset-sandi-form";

export const metadata: Metadata = { title: "Lupa kata sandi" };

export default function LupaSandiPage() {
  return (
    <AuthShell>
      <KartuPublik>
        <LupaSandiForm />
      </KartuPublik>
    </AuthShell>
  );
}
