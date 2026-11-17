"use client";

import { ArrowRight, CalendarCheck } from "lucide-react";
import Link from "next/link";
import { AvatarInisial } from "@/components/common/avatar-inisial";
import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { Panel, PanelFooter, PanelHeader } from "@/components/common/panel";
import { StatusBadge } from "@/components/common/status-badge";
import { UnitChip } from "@/components/common/unit-chip";
import { Button } from "@/components/ui/button";
import { formatJam, formatRentangTanggal } from "@/utils/format";
import type { KegiatanRingkas } from "../types";

const kolom: DataTableColumn<KegiatanRingkas>[] = [
  {
    id: "judul",
    header: "Kegiatan",
    cell: (k) => (
      <div className="flex max-w-72 min-w-44 flex-col gap-0.5 whitespace-normal">
        <Link href={`/kegiatan/${k.id}`} className="font-semibold text-foreground hover:text-primary hover:underline">
          {k.judul}
        </Link>
        <span className="text-xs text-muted-foreground">{k.jenis}</span>
      </div>
    ),
  },
  {
    id: "bidang",
    header: "Bidang",
    cell: (k) => <UnitChip className="max-w-52 min-w-32 whitespace-normal">{k.bidang}</UnitChip>,
  },
  {
    id: "tanggal",
    header: "Tanggal",
    cell: (k) => (
      <span className="tabular-nums">
        {formatRentangTanggal(k.tglMulai, k.tglSelesai)}
        <span className="block text-xs text-muted-foreground">{formatJam(k.tglMulai)}</span>
      </span>
    ),
  },
  {
    id: "lokasi",
    header: "Lokasi",
    cell: (k) => <span className="block max-w-44 min-w-28 whitespace-normal">{k.lokasiNama ?? "–"}</span>,
  },
  { id: "status", header: "Status", cell: (k) => <StatusBadge status={k.statusPelaksanaan} /> },
  {
    id: "pj",
    header: "Penanggung jawab",
    cell: (k) => (
      <span className="flex items-center gap-2">
        <AvatarInisial nama={k.penanggungJawab} className="size-7" />
        {k.penanggungJawab}
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
