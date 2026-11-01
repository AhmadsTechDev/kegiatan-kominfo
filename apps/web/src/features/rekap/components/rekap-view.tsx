// =============================================================================
// HALAMAN REKAPITULASI KEGIATAN OTOMATIS
// =============================================================================
// Gunanya: Menampilkan visualisasi data statistik kegiatan dinas yang mencakup
// kartu ringkasan, grafik tren waktu, peringkat bidang/pegawai, dan jenis kegiatan.
//
// Isi berkas:
//   - Pengalih       : tombol pemilih satuan periode (harian, bulanan, tahunan)
//   - KartuRingkasan : kartu metrik total kegiatan, unit, pegawai, periode tersibuk
//   - RekapView      : komponen utama penyusun filter, grafik, dan tabel rekap
//
// Cara kerja:
//   1. Membaca parameter penyaring dari URL dan satuan waktu yang aktif.
//   2. Mengambil data ringkasan terkini dari backend menggunakan useRekap.
//   3. Membatasi rentang ke bulan berjalan jika satuan harian dipilih tanpa tanggal.
//   4. Menyajikan visualisasi data interaktif dan navigasi ke halaman laporan cetak.
//
// Catatan penting:
//   - Mengacu pada spesifikasi fitur features/04-rekap-otomatis.md.
//   - Hak akses pegawai dibatasi hanya melihat unit kerja dan kegiatannya sendiri.
//
// Dipakai oleh: frontend/src/app/(app)/rekap/page.tsx
// =============================================================================

"use client";

import { Building2, CalendarRange, FileText, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ErrorState } from "@/components/shared/error-state";
import { FilterBar, type NilaiFilter } from "@/components/shared/filter-bar";
import { PageHeader } from "@/components/shared/page-header";
import { labelRentang } from "@/components/shared/rentang-tanggal-picker";
import { Panel, PanelHeader } from "@/components/shared/panel";
import { StatCard, StatCardSkeleton } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartJenis } from "@/features/dashboard/components/chart-jenis";
import { useLingkupPegawai } from "@/features/auth/hooks/use-lingkup";
import { useReferensi } from "@/features/kegiatan/hooks/use-kegiatan";
import { useKegiatanFilter } from "@/features/kegiatan/hooks/use-kegiatan-filter";
import { useAnimasiPertama } from "@/hooks/use-animasi-pertama";
import { formatAngka, tanggalWib } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useRekap } from "../hooks/use-rekap";
import type { RekapData, SatuanRekap } from "../types";
import { TabelRekapPegawai } from "./tabel-rekap-pegawai";
import { TabelRekapUnit } from "./tabel-rekap-unit";
import { labelPeriode, TrenRekap } from "./tren-rekap";

const SATUAN: { nilai: SatuanRekap; label: string }[] = [
  { nilai: "hari", label: "Harian" },
  { nilai: "bulan", label: "Bulanan" },
  { nilai: "tahun", label: "Tahunan" },
];

function Pengalih<T extends string>({ label, pilihan, nilai, onPilih }: { label: string; pilihan: { nilai: T; label: string }[]; nilai: T; onPilih: (v: T) => void }) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-lg border bg-muted/50 p-0.5">
      {pilihan.map((p) => (
        <Button
          key={p.nilai}
          type="button"
          variant="ghost"
          size="sm"
          aria-pressed={nilai === p.nilai}
          className={cn("h-8 px-3 text-xs", nilai === p.nilai && "bg-card font-semibold shadow-sm hover:bg-card")}
          onClick={() => onPilih(p.nilai)}
        >
          {p.label}
        </Button>
      ))}
    </div>
  );
}

function KartuRingkasan({ data, cakupan }: { data: RekapData; cakupan: string }) {
  const { total, perUnit, perPegawai, tren, satuan } = data;
  const tersibuk = tren.reduce<RekapData["tren"][number] | null>((maks, t) => (!maks || t.jumlah > maks.jumlah ? t : maks), null);
  return (
    <>
      <StatCard label="Total kegiatan" value={total.total} icon={CalendarRange} keterangan={cakupan} />
      <StatCard
        label="Bidang terlibat"
        value={perUnit.filter((u) => u.total > 0).length}
        icon={Building2}
        keterangan={`dari ${formatAngka(perUnit.length)} unit kerja pada rekap ini`}
      />
      <StatCard label="Pegawai terlibat" value={perPegawai.length} icon={Users} keterangan={`${formatAngka(total.peserta)} peserta tercatat`} />
      <StatCard
        label={`${satuan === "hari" ? "Hari" : satuan === "bulan" ? "Bulan" : "Tahun"} tersibuk`}
        value={tersibuk?.jumlah ?? 0}
        icon={TrendingUp}
        keterangan={tersibuk && tersibuk.jumlah > 0 ? labelPeriode(tersibuk.periode, satuan) : "Belum ada kegiatan"}
      />
    </>
  );
}

function RekapSkeleton() {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <Skeleton className="h-80 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </>
  );
}

function hrefLaporan(filter: NilaiFilter) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ dari: filter.dari, sampai: filter.sampai, unit: filter.unit, pegawai: filter.pegawai })) if (v) params.set(k, v);
  const qs = params.toString();
  return qs ? `/laporan?${qs}` : "/laporan";
}

export function RekapView() {
  const { filter: filterUrl, setFilter, resetFilter, adaFilter } = useKegiatanFilter();
  const { terbatas, unit: unitSaya, saringUnit } = useLingkupPegawai();
  const { q, dari, sampai, unit, jenis, status, pegawai } = filterUrl;
  const filter = useMemo<NilaiFilter>(() => ({ q, dari, sampai, unit, jenis, status, pegawai }), [q, dari, sampai, unit, jenis, status, pegawai]);
  const [satuan, setSatuan] = useState<SatuanRekap>("bulan");
  const [peringkat, setPeringkat] = useState<"bidang" | "pegawai">("bidang");

  const rekap = useRekap(filter, satuan);
  const referensi = useReferensi();
  const animasi = useAnimasiPertama(rekap.data);

  const namaUnit = referensi.data?.unitKerja.find((u) => String(u.id) === filter.unit)?.nama;
  const cakupan = [labelRentang(filter), filter.unit ? (namaUnit ?? "unit terpilih") : terbatas ? "lingkup Anda" : "seluruh dinas"].join(" · ");

  const pilihSatuan = (s: SatuanRekap) => {
    setSatuan(s);
    if (s === "hari" && !filter.dari && !filter.sampai) {
      const hariIni = tanggalWib(new Date());
      setFilter({ dari: `${hariIni.slice(0, 8)}01`, sampai: hariIni });
    }
  };

  const pengalihPeringkat = (
    <Pengalih
      label="Rekap menurut"
      nilai={peringkat}
      onPilih={setPeringkat}
      pilihan={[
        { nilai: "bidang", label: "Per bidang" },
        { nilai: "pegawai", label: "Per pegawai" },
      ]}
    />
  );

  return (
    <>
      <PageHeader
        eyebrow="Pelaporan"
        title="Rekap kegiatan"
        description={
          terbatas
            ? `Jumlah kegiatan ${unitSaya?.nama ?? "unit kerja Anda"} dan kegiatan yang Anda catat, dihitung otomatis dari data terkini.`
            : "Jumlah dan sebaran kegiatan per periode, bidang, dan pegawai, dihitung otomatis dari data terkini."
        }
        actions={
          <Button asChild className="h-10">
            <Link href={hrefLaporan(filter)}>
              <FileText aria-hidden />
              Cetak & unduh laporan
            </Link>
          </Button>
        }
      />

      <Panel>
        <div className="flex flex-col gap-4 p-4 md:p-5">
          <FilterBar
            value={filter}
            onChange={setFilter}
            onReset={resetFilter}
            adaFilter={adaFilter}
            unitKerja={saringUnit(referensi.data?.unitKerja ?? [])}
            jenisKegiatan={referensi.data?.jenisKegiatan ?? []}
          />
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-bold text-foreground/80">Rekap per</span>
            <Pengalih label="Satuan periode" nilai={satuan} onPilih={pilihSatuan} pilihan={SATUAN} />
          </div>
        </div>
      </Panel>

      {rekap.isPending ? (
        <RekapSkeleton />
      ) : rekap.isError ? (
        <ErrorState message={rekap.error.message} onRetry={() => rekap.refetch()} retrying={rekap.isRefetching} />
      ) : (
        <div className={cn("flex animate-in flex-col gap-4 duration-150 fade-in lg:gap-5", rekap.isPlaceholderData && "opacity-60")}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
            <KartuRingkasan data={rekap.data} cakupan={cakupan} />
          </div>
          <TrenRekap data={rekap.data} animasi={animasi} />
          {peringkat === "bidang" ? (
            <TabelRekapUnit terbatas={terbatas} data={rekap.data} filter={filter} aksi={pengalihPeringkat} />
          ) : (
            <Panel>
              <PanelHeader title="Rekap per pegawai" description="Kegiatan per penanggung jawab, terbanyak di atas" action={pengalihPeringkat} />
              <TabelRekapPegawai data={rekap.data} filter={filter} />
            </Panel>
          )}
          <ChartJenis data={rekap.data.perJenis} animasi={animasi} />
        </div>
      )}
    </>
  );
}
