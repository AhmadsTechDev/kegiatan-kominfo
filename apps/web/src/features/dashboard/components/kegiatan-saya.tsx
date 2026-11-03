// =============================================================================
// KOMPONEN PANEL KEGIATAN SAYA
// =============================================================================
// Gunanya: Menampilkan panel daftar tugas pribadi pegawai yang mencakup kegiatan
// yang perlu dokumentasi dan agenda mendatang pada Aplikasi Pendataan Kegiatan.
//
// Isi berkas:
//   - JudulKolom : Label judul bagian dengan ikon dan lencana hitungan jumlah.
//   - Kosong : Pesan konfirmasi positif ketika tidak ada tugas atau agenda tersisa.
//   - BarisDokumentasi : Baris kegiatan selesai yang belum memiliki dokumentasi.
//   - BarisAgenda : Baris jadwal kegiatan aktif atau yang akan datang.
//   - KegiatanSayaPanel : Komponen utama panel tugas personal pegawai.
//
// Cara kerja:
//   1. Mengambil data aktivitas pegawai yang login melalui hook useKegiatanSaya.
//   2. Menampilkan kolom daftar kegiatan selesai yang memerlukan unggahan bukti foto/PDF.
//   3. Menampilkan kolom jadwal agenda kegiatan milik pengguna dalam waktu dekat.
//
// Catatan penting:
//   - Berfokus pada daftar tugas tindak lanjut pegawai, bukan skor kinerja (FR-09).
//   - Menggunakan container queries (@container) agar pembagian dua kolom menyesuaikan
//     lebar aktual panel, bukan sekadar lebar layar peramban.
//
// Dipakai oleh: features/dashboard/components/dashboard-pegawai.tsx
// =============================================================================

"use client";

import { ArrowRight, CalendarClock, CheckCircle2, FileWarning, Upload } from "lucide-react";
import Link from "next/link";
import { ErrorState } from "@/components/shared/error-state";
import { Panel, PanelFooter, PanelHeader } from "@/components/shared/panel";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAngka, formatJam, formatRentangTanggal, formatTanggal } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useKegiatanSaya } from "../hooks/use-dashboard";
import type { KegiatanRingkas } from "../types";

function JudulKolom({ ikon: Ikon, judul, jumlah, nada }: { ikon: typeof FileWarning; judul: string; jumlah: number; nada: string }) {
  return (
    <div className="flex items-center gap-2">
      <span aria-hidden className={cn("flex size-7 items-center justify-center rounded-lg", nada)}>
        <Ikon className="size-3.5" />
      </span>
      <h3 className="text-sm font-bold">{judul}</h3>
      {jumlah > 0 && (
        <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">{formatAngka(jumlah)}</span>
      )}
    </div>
  );
}

function Kosong({ teks }: { teks: string }) {
  return (
    <p className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground">
      <CheckCircle2 aria-hidden className="size-4 shrink-0 text-status-selesai-foreground" />
      {teks}
    </p>
  );
}

function BarisDokumentasi({ k }: { k: KegiatanRingkas }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Link href={`/kegiatan/${k.id}`} className="truncate text-sm font-semibold hover:text-primary hover:underline">
          {k.judul}
        </Link>
        <span className="truncate text-xs text-muted-foreground">
          Selesai {formatTanggal(k.tglSelesai)} · {k.jenis}
        </span>
      </div>
      <Button asChild variant="outline" size="sm" className="h-8 shrink-0 gap-1 text-xs">
        <Link href={`/kegiatan/${k.id}#dokumentasi`} aria-label={`Unggah dokumentasi ${k.judul}`}>
          <Upload aria-hidden className="size-3.5" />
          Unggah
        </Link>
      </Button>
    </li>
  );
}

function BarisAgenda({ k }: { k: KegiatanRingkas }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Link href={`/kegiatan/${k.id}`} className="truncate text-sm font-semibold hover:text-primary hover:underline">
          {k.judul}
        </Link>
        <span className="truncate text-xs text-muted-foreground tabular-nums">
          {formatRentangTanggal(k.tglMulai, k.tglSelesai)} · {formatJam(k.tglMulai)}
          {k.lokasiNama ? ` · ${k.lokasiNama}` : ""}
        </span>
      </div>
      <StatusBadge status={k.statusPelaksanaan} className="shrink-0" />
    </li>
  );
}

export function KegiatanSayaPanel({ className }: { className?: string }) {
  const { data, isPending, isError, error, refetch, isRefetching } = useKegiatanSaya();

  return (
    <Panel className={cn("@container", className)}>
      <PanelHeader title="Kegiatan saya" />
      {isError ? (
        <div className="px-4 pb-4 md:px-5">
          <ErrorState message={error.message} onRetry={() => refetch()} retrying={isRefetching} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 px-4 pb-4 md:px-5 @2xl:grid-cols-2">
          <section aria-label="Perlu dokumentasi" className="flex min-w-0 flex-col gap-2">
            <JudulKolom
              ikon={FileWarning}
              judul="Perlu dokumentasi"
              jumlah={data?.perluDokumentasi.total ?? 0}
              nada="bg-status-berlangsung text-status-berlangsung-foreground"
            />
            {isPending ? (
              <Skeleton className="h-32 w-full rounded-lg" />
            ) : data.perluDokumentasi.items.length === 0 ? (
              <Kosong teks="Semua kegiatan Anda yang selesai sudah berdokumentasi." />
            ) : (
              <ul className="flex flex-col divide-y divide-muted">
                {data.perluDokumentasi.items.map((k) => (
                  <BarisDokumentasi key={k.id} k={k} />
                ))}
              </ul>
            )}
          </section>
          <section aria-label="Agenda saya" className="flex min-w-0 flex-col gap-2">
            <JudulKolom ikon={CalendarClock} judul="Agenda saya" jumlah={data?.agenda.total ?? 0} nada="bg-secondary text-primary" />
            {isPending ? (
              <Skeleton className="h-32 w-full rounded-lg" />
            ) : data.agenda.items.length === 0 ? (
              <Kosong teks="Tidak ada kegiatan Anda yang berlangsung atau akan datang." />
            ) : (
              <ul className="flex flex-col divide-y divide-muted">
                {data.agenda.items.map((k) => (
                  <BarisAgenda key={k.id} k={k} />
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
      <PanelFooter>
        <Link href="/kegiatan?milik=saya" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
          Lihat semua kegiatan saya
          <ArrowRight aria-hidden className="size-3.5" />
        </Link>
      </PanelFooter>
    </Panel>
  );
}
