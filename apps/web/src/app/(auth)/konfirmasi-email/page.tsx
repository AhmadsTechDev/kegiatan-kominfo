import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { KartuPublik } from "@/features/auth/components/kartu-publik";
import { KonfirmasiEmailView } from "@/features/auth/components/konfirmasi-email-view";

// Halaman konfirmasi ganti email dari tautan di email baru (/konfirmasi-email)

export const metadata: Metadata = { title: "Verifikasi email" };

export default function KonfirmasiEmailPage() {
  return (
    <AuthShell>
      <KartuPublik>
        <Suspense fallback={<Skeleton className="h-32 w-full rounded-xl" />}>
          <KonfirmasiEmailView />
        </Suspense>
      </KartuPublik>
    </AuthShell>
  );
}
