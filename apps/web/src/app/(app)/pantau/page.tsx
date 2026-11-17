import type { Metadata } from "next";
import { Suspense } from "react";
import { PantauView } from "@/features/pantau/components/pantau-view";

export const metadata: Metadata = { title: "Pantau" };

export default function PantauPage() {
  return (
    <Suspense>
      <PantauView />
    </Suspense>
  );
}
