"use client";

import { ArrowRight, CalendarDays, ChevronRight, CalendarRange, ClipboardList, FileWarning, MapPin, Plus, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/shared/panel";
import { StatCard, StatCardSkeleton } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import { useProfil } from "@/features/auth/hooks/use-profil";
import { useSapaan } from "@/hooks/use-sapaan";
import { formatHari, formatJam, formatRentangTanggal, tanggalWib } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useKegiatanSaya } from "../hooks/use-dashboard";
import type { AgendaPekan } from "../types";
import { KegiatanSayaPanel } from "./kegiatan-saya";

/**
 * Dashboard pegawai: agenda dan tugas pribadi
 */

function Sambutan({ hariIni }: { hariIni?: string }) {
  const sapaan = useSapaan();
  const { user } = useCurrentUser();
  const unit = useProfil().data?.pegawai?.bidang;
  const namaDepan = user?.name.split(" ")[0];

  return (
    <section className="relative overflow-hidden rounded-xl border bg-card p-5 shadow-sm md:p-6">
      <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1.5">
          <p className="flex items-center gap-1.5 text-xs font-bold tracking-widest text-primary uppercase">
            <CalendarDays aria-hidden className="size-3.5" />
            {hariIni ? formatHari(hariIni) : "Ringkasan"}
          </p>
          <h1 className="font-heading text-2xl font-extrabold tracking-tight md:text-3xl">
            {sapaan}
            {namaDepan ? `, ${namaDepan}` : ""}
          </h1>
          {unit && <p className="max-w-xl text-sm text-muted-foreground">{unit.nama}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild className="h-10">
            <Link href="/kegiatan/baru">
              <Plus aria-hidden />
              Tambah kegiatan
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-10 bg-card/80">
            <Link href="/kalender">
              <CalendarDays aria-hidden />
              Kalender
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

const NADA_IKON = {
  dibatalkan: "bg-status-dibatalkan text-status-dibatalkan-foreground",
  "akan-datang": "bg-status-akan-datang text-status-akan-datang-foreground",
  primary: "bg-secondary text-primary",
} as const;

function TautanAngka({ href, ...props }: React.ComponentProps<typeof StatCard> & { href: string; nada: keyof typeof NADA_IKON }) {
  const Ikon = props.icon;
  return (
    <Link
      href={href}
      className="group block rounded-xl transition-transform duration-150 ease-out-expo hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <span className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-sm sm:hidden">
        <span aria-hidden className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", NADA_IKON[props.nada])}>
          <Ikon className="size-4" />
        </span>
        <span className="min-w-0 flex-1 text-sm font-semibold">{props.label}</span>
        <span className="font-heading text-xl font-extrabold tabular-nums">{props.value}</span>
        <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
      </span>
      <StatCard {...props} className="h-full transition-shadow duration-150 group-hover:shadow-md max-sm:hidden" />
    </Link>
  );
}

function kelompokkanPerHari(items: AgendaPekan[], hariIni: string) {
  const grup = new Map<string, AgendaPekan[]>();
  for (const k of items) {
    const mulai = tanggalWib(k.tglMulai);
    const hari = mulai < hariIni ? hariIni : mulai;
    grup.set(hari, [...(grup.get(hari) ?? []), k]);
  }
  return [...grup.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function labelHari(tanggal: string, hariIni: string) {
  const besok = new Date(`${hariIni}T12:00:00Z`);
  besok.setUTCDate(besok.getUTCDate() + 1);
  if (tanggal === hariIni) return "Hari ini";
  if (tanggal === besok.toISOString().slice(0, 10)) return "Besok";
  return formatHari(tanggal, true);
}

function AgendaPekanPanel({ items, hariIni, className }: { items?: AgendaPekan[]; hariIni?: string; className?: string }) {
  return (
    <Panel className={className}>
      <PanelHeader title="Agenda 7 hari ke depan" />
      <PanelBody className="flex-1">
        {!items || !hariIni ? (
          <Skeleton className="h-48 w-full rounded-lg" />
        ) : items.length === 0 ? (
          <EmptyState icon={CalendarRange} title="Tidak ada agenda dalam tujuh hari ke depan." description="Kegiatan yang dijadwalkan akan muncul di sini." />
        ) : (
          <ol className="flex flex-col gap-4">
            {kelompokkanPerHari(items, hariIni).map(([hari, daftar]) => (
              <li key={hari} className="flex flex-col gap-2">
                <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">{labelHari(hari, hariIni)}</p>
                <ul className="flex flex-col gap-2">
                  {daftar.map((k) => (
                    <li key={k.id}>
                      <Link
                        href={`/kegiatan/${k.id}`}
                        className="flex gap-3 rounded-lg border bg-background p-3 transition-colors duration-120 ease-out hover:border-primary/30 hover:bg-secondary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      >
                        <span className="w-12 shrink-0 text-sm font-bold text-primary tabular-nums">{formatJam(k.tglMulai).replace(" WIB", "")}</span>
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="flex items-start justify-between gap-2">
                            <span className="text-sm font-semibold">{k.judul}</span>
                            <StatusBadge status={k.statusPelaksanaan} className="shrink-0" />
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {k.jenis} · {formatRentangTanggal(k.tglMulai, k.tglSelesai)}
                          </span>
                          {k.lokasiNama && (
                            <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                              <MapPin aria-hidden className="size-3 shrink-0" />
                              {k.lokasiNama}
                            </span>
                          )}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        )}
      </PanelBody>
      <PanelFooter>
        <Link href="/kalender" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
          Buka kalender
          <ArrowRight aria-hidden className="size-3.5" />
        </Link>
      </PanelFooter>
    </Panel>
  );
}

const ANGKA: { kunci: "dok" | "agenda" | "unit"; label: string; icon: LucideIcon; nada: "dibatalkan" | "akan-datang" | "primary" }[] = [
  { kunci: "dok", label: "Perlu dokumentasi", icon: FileWarning, nada: "dibatalkan" },
  { kunci: "agenda", label: "Agenda saya", icon: CalendarRange, nada: "akan-datang" },
  { kunci: "unit", label: "Kegiatan bidang bulan ini", icon: ClipboardList, nada: "primary" },
];

export function DashboardPegawai() {
  const { data } = useKegiatanSaya();
  const periodeIni = data?.hariIni.slice(0, 7);

  const nilai = {
    dok: { value: data?.perluDokumentasi.total ?? 0, href: "/kegiatan?milik=saya&status=selesai", ket: "Kegiatan selesai Anda tanpa foto atau PDF" },
    agenda: { value: data?.agenda.total ?? 0, href: "/kegiatan?milik=saya", ket: "Berlangsung atau akan datang" },
    unit: { value: data?.unit?.jumlahBulanIni ?? 0, href: periodeIni ? `/kegiatan?periode=${periodeIni}` : "/kegiatan", ket: "Seluruh kegiatan bidang Anda" },
  };

  return (
    <>
      <Sambutan hariIni={data?.hariIni} />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-4 lg:gap-5">
        {ANGKA.map((a) =>
          data ? (
            <TautanAngka key={a.kunci} href={nilai[a.kunci].href} label={a.label} icon={a.icon} nada={a.nada} value={nilai[a.kunci].value} keterangan={nilai[a.kunci].ket} />
          ) : (
            <StatCardSkeleton key={a.kunci} />
          ),
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
        <KegiatanSayaPanel className="lg:col-span-7" />
        <AgendaPekanPanel items={data?.pekanIni} hariIni={data?.hariIni} className="lg:col-span-5" />
      </div>
    </>
  );
}
