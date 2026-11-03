// =============================================================================
// KOMPONEN KEGIATAN AKAN DATANG
// =============================================================================
// Gunanya: Menampilkan daftar agenda kegiatan dinas terdekat yang akan segera
// dilaksanakan pada panel dashboard Aplikasi Pendataan Kegiatan.
//
// Isi berkas:
//   - kolom : Konfigurasi kolom tabel DataTable tingkat modul agar referensi stabil.
//   - KartuKegiatan : Tampilan kartu vertikal untuk layar perangkat bergerak (mobile).
//   - KegiatanAkanDatang : Komponen utama panel daftar kegiatan terdekat.
//
// Cara kerja:
//   1. Menerima daftar data kegiatan ringkas yang berstatus akan datang.
//   2. Merender DataTable responsif (format tabel pada desktop, kartu pada mobile).
//   3. Menyediakan tautan rincian kegiatan dan navigasi ke daftar kegiatan lengkap.
//
// Catatan penting:
//   - Definisi kolom dideklarasikan di tingkat modul agar referensinya stabil
//     dan tidak memicu render ulang yang tidak perlu pada TanStack Table.
//
// Dipakai oleh: features/dashboard/components/dashboard-view.tsx
// =============================================================================

"use client";

import { ArrowRight, CalendarCheck } from "lucide-react";
import Link from "next/link";
import { AvatarInisial } from "@/components/shared/avatar-inisial";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { Panel, PanelFooter, PanelHeader } from "@/components/shared/panel";
import { StatusBadge } from "@/components/shared/status-badge";
import { UnitChip } from "@/components/shared/unit-chip";
import { Button } from "@/components/ui/button";
import { formatJam, formatRentangTanggal } from "@/lib/format";
import type { KegiatanRingkas } from "../types";

const kolom: DataTableColumn<KegiatanRingkas>[] = [
  {
    id: "judul",
    header: "Kegiatan",
    cell: ({ row }) => (
      <div className="flex max-w-72 min-w-44 flex-col gap-0.5 whitespace-normal">
        <Link href={`/kegiatan/${row.original.id}`} className="font-semibold text-foreground hover:text-primary hover:underline">
          {row.original.judul}
        </Link>
        <span className="text-xs text-muted-foreground">{row.original.jenis}</span>
      </div>
    ),
  },
  {
    id: "bidang",
    header: "Bidang",
    cell: ({ row }) => <UnitChip className="max-w-52 min-w-32 whitespace-normal">{row.original.bidang}</UnitChip>,
  },
  {
    id: "tanggal",
    header: "Tanggal",
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatRentangTanggal(row.original.tglMulai, row.original.tglSelesai)}
        <span className="block text-xs text-muted-foreground">{formatJam(row.original.tglMulai)}</span>
      </span>
    ),
  },
  {
    id: "lokasi",
    header: "Lokasi",
    cell: ({ row }) => <span className="block max-w-44 min-w-28 whitespace-normal">{row.original.lokasiNama ?? "–"}</span>,
  },
  { id: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.statusPelaksanaan} /> },
  {
    id: "pj",
    header: "Penanggung jawab",
    cell: ({ row }) => (
      <span className="flex items-center gap-2">
        <AvatarInisial nama={row.original.penanggungJawab} className="size-7" />
        {row.original.penanggungJawab}
      </span>
    ),
  },
];

function KartuKegiatan({ k }: { k: KegiatanRingkas }) {
  return (
    <Link
      href={`/kegiatan/${k.id}`}
      className="flex flex-col gap-2 rounded-lg border bg-card p-3 transition-[translate,box-shadow,background-color] duration-150 ease-out-expo hover:-translate-y-0.5 hover:bg-muted hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold">{k.judul}</span>
        <StatusBadge status={k.statusPelaksanaan} className="shrink-0" />
      </div>
      <span className="text-xs text-muted-foreground">
        {formatRentangTanggal(k.tglMulai, k.tglSelesai)} · {formatJam(k.tglMulai)}
      </span>
      <span className="text-xs text-muted-foreground">
        {k.bidang} · {k.penanggungJawab}
      </span>
    </Link>
  );
}

export function KegiatanAkanDatang({
  data,
  animasi,
  className,
}: {
  data: KegiatanRingkas[];
  animasi: boolean;
  className?: string;
}) {
  return (
    <Panel className={className}>
      <PanelHeader
        title="Kegiatan akan datang"
        description="Agenda terdekat yang tercatat"
        action={
          <Button asChild variant="outline" size="sm" className="h-9">
            <Link href="/kegiatan?status=akan_datang">
              Lihat semua
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        }
      />
      <DataTable
        columns={kolom}
        data={data}
        bleed
        caption="Lima kegiatan terdekat yang akan datang"
        getRowKey={(k) => String(k.id)}
        renderMobileCard={(k) => <KartuKegiatan k={k} />}
        animasiMasuk={animasi}
        empty={{ icon: CalendarCheck, title: "Belum ada kegiatan terjadwal." }}
      />
      {data.length > 0 && (
        <PanelFooter>
          <span>Menampilkan {data.length} kegiatan terdekat</span>
        </PanelFooter>
      )}
    </Panel>
  );
}
