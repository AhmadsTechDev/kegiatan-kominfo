import type { Metadata } from "next";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { KartuPublik } from "@/features/auth/components/kartu-publik";
import { MintaAkunForm } from "@/features/auth/components/minta-akun-form";

/**
 * Halaman pengajuan akun baru ke admin (/minta-akun)
 */

export const metadata: Metadata = { title: "Minta akun" };

export default function MintaAkunPage() {
  return (
    <AuthShell>
      <KartuPublik>
        <MintaAkunForm />
      </KartuPublik>
    </AuthShell>
  );
}

