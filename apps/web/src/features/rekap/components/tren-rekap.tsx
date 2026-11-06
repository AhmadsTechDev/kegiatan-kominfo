"use client";

import { BarChart3 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { EmptyState } from "@/components/shared/empty-state";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import { formatAngka, formatPeriode, formatTanggal } from "@/lib/format";
import { cn } from "@/lib/utils";
import { redamGeserGrafik, useLayarSentuh } from "@/hooks/use-layar-sentuh";
import type { RekapData, SatuanRekap } from "../types";

/**
 * Grafik tren jumlah kegiatan, plus daftar rincian untuk pembaca layar
 */

const config = { jumlah: { label: "Kegiatan", color: "var(--chart-1)" } } satisfies ChartConfig;
const RADIUS_ATAS: [number, number, number, number] = [4, 4, 0, 0];

export function labelPeriode(kode: string, satuan: SatuanRekap, ringkas = false) {
  if (satuan === "hari") return ringkas ? String(Number(kode.slice(8, 10))) : formatTanggal(`${kode}T12:00:00+07:00`);
  if (satuan === "bulan") return formatPeriode(kode, !ringkas);
  return kode;
}

const NAMA_SATUAN: Record<SatuanRekap, string> = { hari: "harian", bulan: "bulanan", tahun: "tahunan" };

type Props = { data: RekapData; animasi: boolean; className?: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- tipe generik tooltip Recharts terlalu rumit untuk dirinci
function TooltipTren({ active, payload, satuan }: any) {
  if (!active || !payload?.length) return null;
  const t = payload[0].payload as { periode: string; jumlah: number };
  return (
    <div className="rounded-xl border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-xl">
      <p className="font-semibold text-muted-foreground">{labelPeriode(t.periode, satuan)}</p>
      <p className="mt-0.5 font-heading text-sm font-bold tabular-nums">{formatAngka(t.jumlah)} kegiatan</p>
    </div>
  );
}

export function TrenRekap({ data, animasi, className }: Props) {
  const { tren, satuan } = data;
  const baris = tren.map((t) => ({ ...t, label: labelPeriode(t.periode, satuan, true) }));
  const kosong = tren.every((t) => t.jumlah === 0);
  const sentuh = useLayarSentuh();
  const rataRata = tren.length === 0 ? 0 : data.total.total / tren.length;

  return (
    <Panel className={className}>
      <PanelHeader
        title={`Tren kegiatan ${NAMA_SATUAN[satuan]}`}
        description={
          kosong
            ? undefined
            : `Rata-rata ${rataRata.toLocaleString("id-ID", { maximumFractionDigits: 1 })} kegiatan per ${satuan} selama ${formatAngka(tren.length)} ${satuan}`
        }
      />
      <PanelBody>
        {kosong ? (
          <EmptyState icon={BarChart3} title="Belum ada kegiatan pada periode ini." description="Ubah rentang tanggal atau filter untuk melihat tren." />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1fr_16rem]">
            <ChartContainer
              config={config}
              className="aspect-auto h-72 w-full"
              role="img"

              /**
               * HP: menggulir melewati grafik tidak memunculkan tooltip; tooltip dibuka dengan ketukan
               */
              {...(sentuh ? redamGeserGrafik : {})}
              aria-label={`Grafik batang jumlah kegiatan ${NAMA_SATUAN[satuan]}, ${tren.length} periode, total ${data.total.total} kegiatan. Angka per periode tersedia di daftar di sampingnya.`}
            >
              <BarChart data={baris} accessibilityLayer barCategoryGap={tren.length > 20 ? "12%" : "28%"} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="4 4" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={8} fontSize={11} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} fontSize={11} />
                <ChartTooltip trigger={sentuh ? "click" : "hover"} cursor={{ fill: "var(--color-muted)", opacity: 0.6 }} content={<TooltipTren satuan={satuan} />} />
                <Bar dataKey="jumlah" fill="var(--color-jumlah)" radius={RADIUS_ATAS} isAnimationActive={animasi} />
              </BarChart>
            </ChartContainer>

            <ol className="max-h-72 overflow-y-auto rounded-lg border text-sm" aria-label={`Jumlah kegiatan ${NAMA_SATUAN[satuan]}`}>
              {[...tren].reverse().map((t) => (
                <li key={t.periode} className="flex items-center justify-between gap-3 border-b px-3 py-1.5 last:border-b-0">
                  <span className="text-muted-foreground">{labelPeriode(t.periode, satuan)}</span>
                  <span className={cn("font-semibold tabular-nums", t.jumlah === 0 && "font-normal text-muted-foreground")}>
                    {formatAngka(t.jumlah)} kegiatan
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </PanelBody>
    </Panel>
  );
}
