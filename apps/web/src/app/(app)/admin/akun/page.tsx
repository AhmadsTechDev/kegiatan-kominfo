import type { Metadata } from "next";
import { Suspense } from "react";
import { AkunView } from "@/features/admin/components/akun-view";

/**
 * Halaman manajemen akun untuk admin (/admin/akun)
 */

export const metadata: Metadata = { title: "Manajemen akun" };

export default function AkunPage() {
  return (
    <Suspense>
      <AkunView />
    </Suspense>
  );
}
