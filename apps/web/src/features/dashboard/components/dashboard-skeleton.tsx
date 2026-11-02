// =============================================================================
// KOMPONEN KERANGKA MUAT DASHBOARD
// =============================================================================
// Gunanya: Menampilkan kerangka skeleton animasi saat data dashboard dimuat
// untuk mencegah pergeseran tata letak (layout shift, DESIGN.md bagian 7).
//
// Isi berkas:
//   - KartuSkeleton : Kerangka placeholder panel kartu grafik dan daftar.
//   - DashboardSkeleton : Grid kerangka utama berpenanda aksesibilitas aria-busy.
//
// Dipakai oleh: app/(app)/dashboard/page.tsx dan dashboard-view.tsx
// =============================================================================

import { StatCardSkeleton } from "@/components/shared/stat-card";
import { Panel, PanelBody } from "@/components/shared/panel";
import { Skeleton } from "@/components/ui/skeleton";

function KartuSkeleton({ className, tinggi = "h-72" }: { className?: string; tinggi?: string }) {
  return (
    <Panel className={className}>
      <div className="flex flex-col gap-2 px-4 pt-4 pb-3 md:px-5 md:pt-5">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-32" />
      </div>
      <PanelBody>
        <Skeleton className={`${tinggi} w-full`} />
      </PanelBody>
    </Panel>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-6 lg:grid-cols-12 lg:gap-5" aria-busy aria-label="Memuat dashboard">
      {Array.from({ length: 4 }, (_, i) => (
        <StatCardSkeleton key={i} className="md:col-span-3" />
      ))}
      <KartuSkeleton className="col-span-2 md:col-span-6 lg:col-span-7" />
      <KartuSkeleton className="col-span-2 md:col-span-6 lg:col-span-5" />
      <KartuSkeleton className="col-span-2 md:col-span-6 lg:col-span-12" tinggi="h-90" />
      <KartuSkeleton className="col-span-2 md:col-span-6 lg:col-span-12" tinggi="h-48" />
    </div>
  );
}
