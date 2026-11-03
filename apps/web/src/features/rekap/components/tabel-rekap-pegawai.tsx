// =============================================================================
// TABEL REKAPITULASI KEGIATAN PER PEGAWAI
// =============================================================================
// Gunanya: Menyajikan tabel peringkat keaktifan pegawai berdasarkan jumlah
// kegiatan yang diampu, diurutkan dari yang terbanyak pada periode terpilih.
//
// Isi berkas:
//   - hrefDaftar        : menyusun tautan rute kegiatan dengan filter per pegawai
//   - TabelRekapPegawai : komponen tabel peringkat kegiatan per penanggung jawab
//
// Cara kerja:
//   1. Menerima data rekapitulasi pegawai dan parameter penyaring yang aktif.
//   2. Menampilkan nomor urut, nama pegawai, bidang, dan jumlah kegiatan.
//   3. Menyediakan tautan pada nama pegawai untuk memeriksa rincian kegiatannya.
//   4. Menampilkan baris total akumulasi kegiatan pada bagian bawah tabel.
//
// Catatan penting:
//   - Mengacu pada dokumen spesifikasi features/04-rekap-otomatis.md.
//   - Tautan langsung mengarah ke daftar kegiatan dengan filter yang sinkron.
//
// Dipakai oleh: frontend/src/features/rekap/components/rekap-view.tsx
// =============================================================================

"use client";

import { Users } from "lucide-react";
import Link from "next/link";
import type { NilaiFilter } from "@/components/shared/filter-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatAngka } from "@/lib/format";
import type { RekapData } from "../types";

function hrefDaftar(filter: NilaiFilter, pegawaiId: number) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...filter, pegawai: String(pegawaiId) })) if (v) params.set(k, String(v));
  return `/kegiatan?${params}`;
}

export function TabelRekapPegawai({ data, filter }: { data: RekapData; filter: NilaiFilter }) {
  if (data.perPegawai.length === 0) {
    return <EmptyState icon={Users} title="Belum ada kegiatan pada periode ini." />;
  }
  return (
    <Table>
      <caption className="sr-only">Jumlah kegiatan per pegawai penanggung jawab, terbanyak di atas</caption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10 pl-4 md:pl-5">No</TableHead>
          <TableHead>Pegawai</TableHead>
          <TableHead>Bidang</TableHead>
          <TableHead className="pr-4 text-right md:pr-5">Kegiatan</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.perPegawai.map((p, i) => (
          <TableRow key={p.id}>
            <TableCell className="pl-4 text-muted-foreground tabular-nums md:pl-5">{i + 1}</TableCell>
            <TableCell>
              <Link href={hrefDaftar(filter, p.id)} className="font-semibold hover:text-primary hover:underline">
                {p.nama}
              </Link>
            </TableCell>
            <TableCell className="max-w-64 truncate text-muted-foreground">{p.bidang}</TableCell>
            <TableCell className="pr-4 text-right font-semibold tabular-nums md:pr-5">{formatAngka(p.jumlah)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={3} className="pl-4 font-bold md:pl-5">
            Total
          </TableCell>
          <TableCell className="pr-4 text-right font-bold tabular-nums md:pr-5">{formatAngka(data.total.total)}</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}
