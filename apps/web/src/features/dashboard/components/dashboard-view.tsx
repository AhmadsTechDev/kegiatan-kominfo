// =============================================================================
// KOMPONEN TAMPILAN DASHBOARD
// =============================================================================
// Gunanya: Menampilkan gerbang utama antarmuka dashboard yang menyesuaikan
// data dan tata letak berdasarkan peran pengguna di Aplikasi Pendataan Kegiatan.
//
// Isi berkas:
//   - TombolTambah : Tombol aksi cepat pembuatan kegiatan baru.
//   - DashboardView : Komponen pemilah tampilan berdasarkan peran pengguna.
//   - DashboardDinas : Tampilan ringkasan statistik dinas untuk admin dan pimpinan.
//
// Cara kerja:
//   1. Memeriksa peran pengguna saat ini menggunakan hook useCurrentUser.
//   2. Mengarahkan peran PEGAWAI ke tampilan personal DashboardPegawai.
//   3. Mengarahkan ADMIN dan PIMPINAN ke tampilan ringkasan dinas DashboardDinas.
//   4. Mengambil data ringkasan periode aktif dan menyajikan seluruh widget panel.
//
// Catatan penting:
//   - Pimpinan hanya memiliki izin membaca data; tombol tambah kegiatan hanya
//     dirender bagi Administrator (backend tetap memvalidasi hak akses ini).
//   - Mendukung pemilihan periode bulan aktif dan pembaruan data secara manual.
//
// Dipakai oleh: app/(app)/dashboard/page.tsx
// =============================================================================

"use client";

import { Plus, RefreshCw } from "lucide-react";
import Link from "next/link";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import { useAnimasiPertama } from "@/hooks/use-animasi-pertama";
import { useSapaan } from "@/hooks/use-sapaan";
import { formatJam, formatPeriode } from "@/lib/format";
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
import { PerluPerhatian } from "./perlu-perhatian";
import { PetaKegiatan } from "./peta-kegiatan";

function TombolTambah() {
  return (
    <Button asChild className="h-10">
      <Link href="/kegiatan/baru">
        <Plus aria-hidden />
        Tambah kegiatan
      </Link>
    </Button>
  );
}

export function DashboardView() {
  const { user, isPending } = useCurrentUser();
  if (isPending || !user) return <DashboardSkeleton />;
  return user.role === "PEGAWAI" ? (
    <DashboardPegawai />
  ) : (
    <DashboardDinas bisaMenambah={user.role === "ADMIN"} namaDepan={user.name.split(" ")[0] ?? user.name} />
  );
}

function DashboardDinas({ bisaMenambah, namaDepan }: { bisaMenambah: boolean; namaDepan: string }) {
  const sapaan = useSapaan();
  const { periode, setPeriode } = usePeriode();
  const { data, isPending, isError, error, refetch, isRefetching, isFetching, dataUpdatedAt } = useDashboard(periode);
  const animasi = useAnimasiPertama(data);


  return (
    <>
      <PageHeader
        eyebrow="Ringkasan dinas"
        title={`${sapaan}, ${namaDepan}`}
        description="Kegiatan seluruh unit kerja, kelengkapan dokumentasi, dan agenda terdekat dalam satu tempat."
        actions={bisaMenambah && <TombolTambah />}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card/80 px-4 py-3">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <span aria-hidden className="size-2 rounded-full bg-status-selesai-foreground ring-3 ring-status-selesai" />
          {data ? `Ringkasan seluruh kegiatan dinas, ${formatPeriode(data.periode, true)}` : "Ringkasan seluruh kegiatan dinas"}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {data && <PeriodePicker value={data.periode} periodeSekarang={data.periodeSekarang} onChange={setPeriode} />}
          {dataUpdatedAt > 0 && (
            <span className="text-xs text-muted-foreground" aria-live="polite">
              Diperbarui {formatJam(new Date(dataUpdatedAt))}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-10"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Muat ulang data dashboard"
          >
            <RefreshCw className={cn(isFetching && "animate-spin")} />
          </Button>
        </div>
      </div>

      {isPending ? (
        <DashboardSkeleton />
      ) : isError ? (
        <ErrorState message={error.message} onRetry={() => refetch()} retrying={isRefetching} />
      ) : (
        <div className="grid animate-in grid-cols-1 gap-4 duration-150 fade-in md:grid-cols-6 lg:grid-cols-12 lg:gap-5">
          <KpiCards data={data} />
          <ChartUnitBulanan data={data.trenUnitBulanan} animasi={animasi} className="md:col-span-6 lg:col-span-7" />
          <ChartJenis data={data.sebaranJenis} animasi={animasi} className="md:col-span-6 lg:col-span-5" />
          <PetaKegiatan data={data.peta} periode={data.periode} className="md:col-span-6 lg:col-span-7" />
          <PerluPerhatian
            data={data.perluPerhatian}
            periode={data.periode}
            animasi={animasi}
            className="md:col-span-6 lg:col-span-5"
          />
          <KegiatanAkanDatang data={data.akanDatang} animasi={animasi} className="md:col-span-6 lg:col-span-12" />
        </div>
      )}
    </>
  );
}
