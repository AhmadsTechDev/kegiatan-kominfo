// =============================================================================
// TABEL REKAPITULASI KEGIATAN PER UNIT KERJA
// =============================================================================
// Gunanya: Menyajikan ringkasan statistik kegiatan per unit kerja dinas yang
// mencakup sebaran status pelaksanaan, total kegiatan, serta jumlah peserta.
//
// Isi berkas:
//   - KOLOM          : konfigurasi kolom metrik status kegiatan dan peserta
//   - hrefDaftar     : pembuat tautan rute kegiatan yang disaring per unit kerja
//   - SelAngka       : komponen sel angka dengan perataan kanan dan format ribuan
//   - TabelRekapUnit : komponen tabel utama rekapitulasi kegiatan per unit kerja
//
// Cara kerja:
//   1. Merender kolom status: akan datang, berlangsung, selesai, dan dibatalkan.
//   2. Menampilkan baris tiap unit kerja dengan tautan menuju daftar kegiatannya.
//   3. Menghitung dan merender baris total keseluruhan dinas pada footer tabel.
//
// Catatan penting:
//   - Mengacu pada panduan antarmuka DESIGN.md bagian 5.6.
//   - Untuk pengguna pegawai (terbatas), rekap ditampilkan per bidang pencatat;
//     sedangkan bagi pimpinan/admin, kegiatan seksi terhitung ke bidang induk.
//
// Dipakai oleh: frontend/src/features/rekap/components/rekap-view.tsx
// =============================================================================

import { Building2 } from "lucide-react";
import Link from "next/link";
import type { NilaiFilter } from "@/components/shared/filter-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { Panel, PanelHeader } from "@/components/shared/panel";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatAngka } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { JumlahStatus, RekapData } from "../types";

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
  terbatas,
  aksi,
  className,
}: {
  data: RekapData;
  filter: NilaiFilter;
  terbatas?: boolean;
  aksi?: React.ReactNode;
  className?: string;
}) {
  return (
    <Panel className={className}>
      <PanelHeader
        title="Rekap per bidang"
        action={aksi}
        description={terbatas ? "Kegiatan dalam lingkup Anda per bidang pencatat" : "Kegiatan sub bidang ikut terhitung ke bidangnya"}
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
