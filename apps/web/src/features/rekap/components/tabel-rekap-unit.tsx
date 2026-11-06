import { Building2 } from "lucide-react";
import Link from "next/link";
import type { NilaiFilter } from "@/components/shared/filter-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { Panel, PanelHeader } from "@/components/shared/panel";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatAngka } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { JumlahStatus, RekapData } from "../types";

// Tabel rekap per bidang: sebaran status, total kegiatan, dan peserta

const KOLOM: { kunci: keyof JumlahStatus; label: string }[] = [
  { kunci: "akanDatang", label: "Akan datang" },
  { kunci: "berlangsung", label: "Berlangsung" },
  { kunci: "selesai", label: "Selesai" },
  { kunci: "dibatalkan", label: "Dibatalkan" },
  { kunci: "total", label: "Total" },
  { kunci: "peserta", label: "Peserta" },
];

function hrefDaftar(filter: NilaiFilter, unitId: number) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...filter, unit: String(unitId) })) if (v) params.set(k, String(v));
  return `/kegiatan?${params}`;
}

function SelAngka({ nilai, tebal }: { nilai: number; tebal?: boolean }) {
  return (
    <TableCell className={cn("text-right tabular-nums last:pr-4 md:last:pr-5", tebal && "font-bold", nilai === 0 && !tebal && "text-muted-foreground")}>
      {formatAngka(nilai)}
    </TableCell>
  );
}

export function TabelRekapUnit({
  data,
  filter,
  aksi,
  className,
}: {
  data: RekapData;
  filter: NilaiFilter;
  aksi?: React.ReactNode;
  className?: string;
}) {
  return (
    <Panel className={className}>
      <PanelHeader
        title="Rekap per bidang"
        action={aksi}
      />
      {data.perUnit.length === 0 ? (
        <EmptyState icon={Building2} title="Tidak ada kegiatan yang cocok." description="Coba ubah filter." className="pb-6" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-y bg-background hover:bg-background">
              <TableHead className="h-10 pl-4 text-xs font-bold tracking-wider text-muted-foreground uppercase md:pl-5">Bidang</TableHead>
              {KOLOM.map((k) => (
                <TableHead key={k.kunci} className="h-10 text-right text-xs font-bold tracking-wider text-muted-foreground uppercase last:pr-4 md:last:pr-5">
                  {k.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.perUnit.map((u) => (
              <TableRow key={u.unit.id}>
                <TableCell className="min-w-56 pl-4 whitespace-normal md:pl-5">
                  <Link href={hrefDaftar(filter, u.unit.id)} className="font-medium hover:text-primary hover:underline">
                    {u.unit.nama}
                  </Link>
                </TableCell>
                {KOLOM.map((k) => (
                  <SelAngka key={k.kunci} nilai={u[k.kunci]} tebal={k.kunci === "total"} />
                ))}
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow className="hover:bg-transparent">
              <TableCell className="pl-4 font-bold md:pl-5">Total</TableCell>
              {KOLOM.map((k) => (
                <SelAngka key={k.kunci} nilai={data.total[k.kunci]} tebal />
              ))}
            </TableRow>
          </TableFooter>
        </Table>
      )}
    </Panel>
  );
}
