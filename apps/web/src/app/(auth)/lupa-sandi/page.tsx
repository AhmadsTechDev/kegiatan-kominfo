import type { Metadata } from "next";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { KartuPublik } from "@/features/auth/components/kartu-publik";
import { LupaSandiForm } from "@/features/auth/components/reset-sandi-form";

// Halaman minta tautan atur ulang kata sandi (/lupa-sandi)

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
