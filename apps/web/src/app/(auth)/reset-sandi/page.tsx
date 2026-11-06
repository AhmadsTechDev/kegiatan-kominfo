import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { KartuPublik } from "@/features/auth/components/kartu-publik";
import { ResetSandiForm } from "@/features/auth/components/reset-sandi-form";

// Halaman buat kata sandi baru dari tautan atur ulang (/reset-sandi)

export const metadata: Metadata = { title: "Atur ulang kata sandi" };

export default function ResetSandiPage() {
  return (
    <AuthShell>
      <KartuPublik>
        <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
          <ResetSandiForm />
        </Suspense>
      </KartuPublik>
    </AuthShell>
  );
}
