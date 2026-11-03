// =============================================================================
// KOMPONEN PANEL PERLU PERHATIAN
// =============================================================================
// Gunanya: Menampilkan daftar kegiatan dinas yang telah berstatus selesai namun
// belum dilengkapi berkas dokumentasi pada Aplikasi Pendataan Kegiatan.
//
// Isi berkas:
//   - PerluPerhatian : Panel pemantau kelengkapan berkas dokumentasi kegiatan.
//
// Cara kerja:
//   1. Menerima data daftar kegiatan selesai yang belum memiliki foto atau berkas.
//   2. Menampilkan lencana peringatan jumlah kegiatan yang perlu dilengkapi.
//   3. Merender daftar kegiatan beranimasi dengan tautan menuju halaman detail.
//   4. Panel hanya dirender bila ada kegiatan yang perlu dilengkapi (lihat
//      dashboard-view.tsx); status "semua lengkap" cukup di kartu KPI Selesai.
//
// Catatan penting:
//   - Kelengkapan dokumentasi menjadi indikator utama kualitas data operasional
//     karena aplikasi tidak menerapkan alur persetujuan bertingkat (PRD bagian 12).
//   - Dokumentasi bersifat opsional sehingga panel ini berperan sebagai pemantau.
//
// Dipakai oleh: features/dashboard/components/dashboard-view.tsx
// =============================================================================

import { ArrowRight, FileWarning } from "lucide-react";
import Link from "next/link";
import { animasiBaris } from "@/components/shared/data-table";
import { Panel, PanelFooter, PanelHeader } from "@/components/shared/panel";
import { formatAngka, formatTanggal } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DashboardData } from "../types";

export function PerluPerhatian({
  data,
  periode,
  animasi,
  className,
}: {
  data: DashboardData["perluPerhatian"];
  periode: string;
  animasi: boolean;
  className?: string;
}) {
  return (
    <Panel className={className}>
      <PanelHeader
        title="Perlu perhatian"
        description="Kegiatan selesai tanpa dokumentasi"
        action={
          <span className="flex h-6 min-w-6 items-center justify-center rounded-md bg-status-berlangsung px-1.5 text-xs font-bold text-status-berlangsung-foreground tabular-nums">
            <span className="sr-only">Jumlah: </span>
            {formatAngka(data.total)}
          </span>
        }
      />
      <p className="mx-4 mb-2 rounded-lg bg-status-berlangsung px-3 py-2.5 text-xs text-status-berlangsung-foreground md:mx-5">
        Dokumentasi bersifat opsional; daftar ini membantu memantau kelengkapan data.
      </p>
      <ul className="flex flex-1 flex-col divide-y divide-muted px-4 md:px-5">
        {data.items.map((k, i) => {
          const masuk = animasiBaris(animasi, i);
          return (
            <li key={k.id} className={cn("flex items-center gap-3 py-3", masuk.className)} style={masuk.style}>
              <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-status-berlangsung text-status-berlangsung-foreground">
                <FileWarning className="size-4" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-sm font-semibold">{k.judul}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {k.bidang} · {formatTanggal(k.tglSelesai)}
                </span>
              </div>
              <Link
                href={`/kegiatan/${k.id}`}
                className="rounded-md px-2 py-1 text-xs font-semibold text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                aria-label={`Lihat ${k.judul}`}
              >
                Lihat
              </Link>
            </li>
          );
        })}
      </ul>
      <PanelFooter>
        <Link
          href={`/kegiatan?status=selesai&periode=${periode}`}
          className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
        >
          Lihat semua kegiatan selesai
          <ArrowRight aria-hidden className="size-3.5" />
        </Link>
      </PanelFooter>
    </Panel>
  );
}
