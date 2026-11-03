// =============================================================================
// KOMPONEN PETA SEBARAN LOKASI KEGIATAN
// =============================================================================
// Gunanya: Menampilkan visualisasi peta interaktif sebaran lokasi koordinat
// kegiatan dinas sesuai periode aktif pada Aplikasi Pendataan Kegiatan.
//
// Isi berkas:
//   - PetaKegiatan : Panel peta koordinat dengan tautan filter daftar kegiatan.
//
// Dipakai oleh: features/dashboard/components/dashboard-view.tsx
// =============================================================================

"use client";

import { ArrowRight, MapPinOff } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { MapOverview } from "@/components/shared/map-overview";
import { Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/shared/panel";
import { site } from "@/config/site";
import { formatAngka } from "@/lib/format";
import type { DashboardData } from "../types";

export function PetaKegiatan({ data, periode, className }: { data: DashboardData["peta"]; periode: string; className?: string }) {
  return (
    <Panel className={className}>
      <PanelHeader
        title="Sebaran lokasi kegiatan"
        action={<span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{site.wilayah}</span>}
      />
      {data.length === 0 ? (
        <PanelBody>
          <EmptyState icon={MapPinOff} title="Belum ada kegiatan bertitik lokasi pada periode ini." />
        </PanelBody>
      ) : (
        <MapOverview titik={data} className="z-0 h-90 w-full" />
      )}
      <PanelFooter>
        <span>
          <span className="font-semibold text-foreground">{formatAngka(data.length)} lokasi</span> memiliki titik koordinat
        </span>
        <Link href={`/kegiatan?periode=${periode}`} className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
          Lihat kegiatan
          <ArrowRight aria-hidden className="size-3.5" />
        </Link>
      </PanelFooter>
    </Panel>
  );
}
