import type { Metadata } from "next";
import { Suspense } from "react";
import { PengaturanView } from "@/features/pengaturan/components/pengaturan-view";

// Halaman pengaturan akun sendiri (/pengaturan)

export const metadata: Metadata = { title: "Pengaturan" };

export default function PengaturanPage() {
  return (
    <Suspense>
      <PengaturanView />
    </Suspense>
  );
}
