import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AktivasiForm } from "@/features/auth/components/aktivasi-form";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { KartuPublik } from "@/features/auth/components/kartu-publik";

// Halaman aktivasi akun lewat tautan email (/aktivasi)

export const metadata: Metadata = { title: "Aktivasi akun" };

export default function AktivasiPage() {
  return (
    <AuthShell>
      <KartuPublik>
        <Suspense fallback={<Skeleton className="h-72 w-full rounded-xl" />}>
          <AktivasiForm />
        </Suspense>
      </KartuPublik>
    </AuthShell>
  );
}
