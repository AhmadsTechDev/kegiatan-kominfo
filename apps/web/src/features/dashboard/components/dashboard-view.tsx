// =============================================================================
// KOMPONEN TAMPILAN DASHBOARD
// =============================================================================
// Gunanya: Menampilkan gerbang utama antarmuka dashboard yang menyesuaikan
// data dan tata letak berdasarkan peran pengguna di Aplikasi Pendataan Kegiatan.
//
// Isi berkas:
//   - DashboardView : Komponen pemilah tampilan berdasarkan peran pengguna.
//   - AkunMenunggu : Baris pemberitahuan akun menunggu aktivasi (khusus admin).
//   - DashboardDinas : Tampilan ringkasan statistik dinas untuk admin dan pimpinan.
//
// Cara kerja:
//   1. Memeriksa peran pengguna saat ini menggunakan hook useCurrentUser.
//   2. Mengarahkan peran PEGAWAI ke tampilan personal DashboardPegawai.
//   3. Mengarahkan ADMIN dan PIMPINAN ke tampilan ringkasan dinas DashboardDinas.
//   4. Mengambil data ringkasan periode aktif dan menyajikan seluruh widget panel.
//
// Catatan penting:
//   - Pimpinan dan admin tidak mencatat kegiatan, jadi tidak ada tombol tambah
//     di dashboard dinas (backend juga menolak 403).
//   - Pemilih periode dan tombol muat ulang berada di baris aksi header.
//   - Dokumentasi bersifat opsional, jadi dashboard tidak lagi menampilkan
//     panel kegiatan selesai tanpa dokumentasi.
//
// Dipakai oleh: app/(app)/dashboard/page.tsx
// =============================================================================

"use client";

import { ArrowRight, Hourglass, RefreshCw } from "lucide-react";
import Link from "next/link";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import { useAnimasiPertama } from "@/hooks/use-animasi-pertama";
import { useSapaan } from "@/hooks/use-sapaan";
import { formatAngka, formatJam } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useDashboard } from "../hooks/use-dashboard";
import { usePeriode } from "../hooks/use-periode";
import { ChartJenis } from "./chart-jenis";
import { ChartUnitBulanan } from "./chart-unit-bulanan";
import { DashboardSkeleton } from "./dashboard-skeleton";
import { DashboardPegawai } from "./dashboard-pegawai";
import { KegiatanAkanDatang } from "./kegiatan-akan-datang";
import { KpiCards } from "./kpi-cards";
import { PeriodePicker } from "./periode-picker";
import { PetaKegiatan } from "./peta-kegiatan";

export function DashboardView() {
  const { user, isPending } = useCurrentUser();
  if (isPending || !user) return <DashboardSkeleton />;
  return user.role === "PEGAWAI" ? (
    <DashboardPegawai />
  ) : (
    <DashboardDinas namaDepan={user.name.split(" ")[0] ?? user.name} />
  );
}

function AkunMenunggu({ jumlah }: { jumlah: number }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border bg-card px-4 py-3 text-sm shadow-sm">
      <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-status-berlangsung text-status-berlangsung-foreground">
        <Hourglass className="size-4" />
      </span>
      <p className="min-w-56 flex-1">
        <span className="font-semibold">{formatAngka(jumlah)} akun menunggu aktivasi.</span>{" "}
        <span className="text-muted-foreground">Pemiliknya belum membuat kata sandi dari email undangan.</span>
      </p>
      <Link
        href="/admin/akun?status=MENUNGGU_AKTIVASI"
        className="inline-flex items-center gap-1 rounded-md font-semibold text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        Lihat akun
        <ArrowRight aria-hidden className="size-3.5" />
      </Link>
    </div>
  );
}

function DashboardDinas({ namaDepan }: { namaDepan: string }) {
  const sapaan = useSapaan();
  const { periode, setPeriode } = usePeriode();
  const { data, isPending, isError, error, refetch, isRefetching, isFetching, dataUpdatedAt } = useDashboard(periode);
  const animasi = useAnimasiPertama(data);
  const menunggu = data?.admin?.menungguAktivasi ?? 0;

  return (
    <>
      <PageHeader
        eyebrow="Ringkasan dinas"
        title={`${sapaan}, ${namaDepan}`}
        description="Kegiatan seluruh bidang dan agenda terdekat dalam satu tempat."
        actions={
          // HP: periode + muat ulang sebaris, Tambah selebar layar, waktu pembaruan di bawah
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            {dataUpdatedAt > 0 && (
              <span className="order-last text-xs text-muted-foreground sm:order-first" aria-live="polite">
                Diperbarui {formatJam(new Date(dataUpdatedAt))}
              </span>
            )}
            <div className="flex items-center gap-2">
              {data && (
                <PeriodePicker value={data.periode} periodeSekarang={data.periodeSekarang} onChange={setPeriode} className="flex-1 sm:w-48 sm:flex-none" />
              )}
              <Button
                variant="outline"
                size="icon"
                className="size-10 shrink-0 pointer-coarse:size-11"
                onClick={() => refetch()}
                disabled={isFetching}
                aria-label="Muat ulang data dashboard"
              >
                <RefreshCw className={cn(isFetching && "animate-spin")} />
              </Button>
            </div>
          </div>
        }
      />

      {menunggu > 0 && <AkunMenunggu jumlah={menunggu} />}

      {isPending ? (
        <DashboardSkeleton />
      ) : isError ? (
        <ErrorState message={error.message} onRetry={() => refetch()} retrying={isRefetching} />
      ) : (
        <div className="grid animate-in grid-cols-2 gap-4 duration-150 fade-in md:grid-cols-6 lg:grid-cols-12 lg:gap-5">
          <KpiCards data={data} />
          <ChartUnitBulanan data={data.trenUnitBulanan} animasi={animasi} className="col-span-2 md:col-span-6 lg:col-span-7" />
          <div className="col-span-2 flex min-w-0 flex-col gap-4 md:col-span-6 lg:col-span-5 lg:gap-5">
            <ChartJenis data={data.sebaranJenis} animasi={animasi} className="flex-1" />
          </div>
          <PetaKegiatan data={data.peta} periode={data.periode} className="col-span-2 md:col-span-6 lg:col-span-12" />
          <KegiatanAkanDatang data={data.akanDatang} animasi={animasi} className="col-span-2 md:col-span-6 lg:col-span-12" />
        </div>
      )}
    </>
  );
}
