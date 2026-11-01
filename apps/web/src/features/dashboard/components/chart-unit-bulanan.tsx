// =============================================================================
// KOMPONEN GRAFIK TREN KEGIATAN PER UNIT BULANAN
// =============================================================================
// Gunanya: Menampilkan visualisasi grafik batang bertumpuk tren kegiatan per
// unit kerja selama enam bulan terakhir pada Aplikasi Pendataan Kegiatan.
//
// Isi berkas:
//   - Ringkasan : Komponen kartu metrik kecil (total, rata-rata, bulan tersibuk).
//   - TooltipKustom : Komponen tooltip detail kontribusi unit per bulan.
//   - ChartUnitBulanan : Komponen utama grafik batang bertumpuk Recharts.
//
// Cara kerja:
//   1. Memetakan data enam bulan terakhir ke format baris Recharts per unit kerja.
//   2. Menyediakan filter interaktif untuk menyembunyikan atau menampilkan unit.
//   3. Menghitung total dan menandai unit teratas (puncak) di tiap bulan.
//   4. Merender kartu metrik ringkasan, grafik Recharts, dan legenda interaktif.
//
// Catatan penting:
//   - Animasi batang tumbuh hanya aktif saat pertama kali dimuat, bukan ketika
//     pengguna mengganti periode filter (DESIGN.md bagian 8.2).
//   - Label nama unit pada legenda dipendekkan dengan regex agar rapi, sedangkan
//     nama lengkap unit kerja tetap disajikan pada tooltip detail.
//   - Minimal satu unit kerja harus selalu tampil agar grafik tidak kosong.
//   - Sudut membulat dan angka total hanya dipasang pada segmen teratas (puncak).
//
// Dipakai oleh: features/dashboard/components/dashboard-view.tsx
// =============================================================================

"use client";

import { BarChart3, ChevronRight, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from "recharts";
import { EmptyState } from "@/components/shared/empty-state";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import { formatAngka, formatPeriode } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DashboardData } from "../types";

const JUMLAH_WARNA = 6;
const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const namaBulanPendek = (kode: string) => BULAN[Number(kode.slice(5, 7)) - 1] ?? kode;
const RADIUS_ATAS: [number, number, number, number] = [6, 6, 0, 0];

const namaPendek = (nama: string) => nama.replace(/^Bidang\s+/i, "").replace(/^Pengelolaan\s+/i, "");

type Props = {
  data: DashboardData["trenUnitBulanan"];
  animasi: boolean;
  className?: string;
};

type Baris = { kode: string; bulan: string; total: number; puncak: string | null } & Record<string, number | string | null>;

function Ringkasan({ label, nilai, keterangan }: { label: string; nilai: string; keterangan?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-xl bg-muted/60 px-3.5 py-2.5">
      <span className="text-[11px] font-semibold text-muted-foreground">{label}</span>
      <span className="truncate font-heading text-lg leading-tight font-extrabold tabular-nums">{nilai}</span>
      {keterangan && <span className="truncate text-[11px] text-muted-foreground">{keterangan}</span>}
    </div>
  );
}

export function ChartUnitBulanan({ data, animasi, className }: Props) {
  const [fokus, setFokus] = useState<string | null>(null);
  const [sembunyi, setSembunyi] = useState<Set<string>>(() => new Set());

  const config = useMemo(
    () =>
      Object.fromEntries(
        data.unitInduk.map((u, i) => [u.kode, { label: u.nama, color: `var(--chart-${(i % JUMLAH_WARNA) + 1})` }]),
      ) satisfies ChartConfig,
    [data.unitInduk],
  );

  const tampil = data.unitInduk.filter((u) => !sembunyi.has(u.kode));
  const periodeTerpilih = data.data.at(-1)?.bulan;

  const baris: Baris[] = data.data.map((d) => {
    const nilai = Object.fromEntries(tampil.map((u) => [u.kode, d.jumlah[u.kode] ?? 0]));
    const puncak = [...tampil].reverse().find((u) => (d.jumlah[u.kode] ?? 0) > 0)?.kode ?? null;
    const total = tampil.reduce((a, u) => a + (d.jumlah[u.kode] ?? 0), 0);
    return { kode: d.bulan, bulan: formatPeriode(d.bulan), total, puncak, ...nilai };
  });

  const totalPerUnit = Object.fromEntries(
    data.unitInduk.map((u) => [u.kode, data.data.reduce((a, d) => a + (d.jumlah[u.kode] ?? 0), 0)]),
  );
  const totalSemua = Object.values(totalPerUnit).reduce((a, b) => a + b, 0);
  const totalTampil = baris.reduce((a, b) => a + b.total, 0);
  const tersibuk = baris.reduce<Baris | null>((maks, b) => (!maks || b.total > maks.total ? b : maks), null);

  const ubahSembunyi = (kode: string) =>
    setSembunyi((s) => {
      const baru = new Set(s);
      if (baru.has(kode)) baru.delete(kode);
      else if (baru.size < data.unitInduk.length - 1) baru.add(kode);
      return baru;
    });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tipe generik tooltip Recharts terlalu rumit untuk dirinci
  function TooltipKustom({ active, payload }: any) {
    if (!active || !payload?.length) return null;
    const b = payload[0].payload as Baris;
    return (
      <div className="min-w-52 rounded-xl border bg-popover px-3 py-2.5 text-xs text-popover-foreground shadow-xl">
        <p className="mb-2 font-semibold text-muted-foreground">{formatPeriode(b.kode, true)}</p>
        <div className="flex flex-col gap-1">
          {[...tampil].reverse().map((u) => (
            <div
              key={u.kode}
              className={cn("flex items-center justify-between gap-5", fokus && fokus !== u.kode && "opacity-45")}
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <span aria-hidden className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: config[u.kode]!.color }} />
                <span className={cn("truncate", fokus === u.kode && "font-semibold")}>{namaPendek(u.nama)}</span>
              </span>
              <span className="font-semibold tabular-nums">{formatAngka(Number(b[u.kode] ?? 0))}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between border-t pt-2 font-bold">
          <span>Total</span>
          <span className="tabular-nums">{formatAngka(b.total)}</span>
        </div>
      </div>
    );
  }

  return (
    <Panel className={className}>
      <PanelHeader
        title="Kegiatan per unit kerja per bulan"
        description="Enam bulan terakhir; kegiatan seksi dan sub bagian dihitung ke unit induknya"
        action={
          <Button asChild variant="outline" size="sm" className="h-9 border-border/60 text-xs">
            <Link href="/kegiatan">
              Lihat kegiatan
              <ChevronRight aria-hidden className="ml-0.5 size-3.5" />
            </Link>
          </Button>
        }
      />
      <PanelBody className="flex flex-col gap-4">
        {totalSemua === 0 ? (
          <EmptyState icon={BarChart3} title="Belum ada kegiatan dalam enam bulan ini." />
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              <Ringkasan label="Total 6 bulan" nilai={formatAngka(totalTampil)} keterangan={sembunyi.size ? "unit terpilih" : "seluruh unit"} />
              <Ringkasan label="Rata-rata" nilai={formatAngka(Math.round((totalTampil / Math.max(1, baris.length)) * 10) / 10)} keterangan="kegiatan per bulan" />
              <Ringkasan
                label="Bulan tersibuk"
                nilai={tersibuk && tersibuk.total > 0 ? formatPeriode(tersibuk.kode) : "–"}
                keterangan={tersibuk && tersibuk.total > 0 ? `${formatAngka(tersibuk.total)} kegiatan` : undefined}
              />
            </div>

            <ChartContainer
              config={config}
              className="aspect-auto h-72 w-full"
              role="img"
              aria-label={`Grafik batang bertumpuk jumlah kegiatan per unit kerja, total ${totalTampil} kegiatan dalam enam bulan`}
            >
              <BarChart data={baris} accessibilityLayer barCategoryGap="28%" margin={{ top: 22, right: 4, left: 0, bottom: 0 }} onMouseLeave={() => setFokus(null)}>
                <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="4 4" />
                <XAxis
                  dataKey="bulan"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  interval={0}
                  height={48}
                  tick={({ x, y, index }) => {
                    const b = baris[index];
                    if (!b) return <g />;
                    const terpilih = b.kode === periodeTerpilih;
                    const tahunBerganti = index === 0 || baris[index - 1]?.kode.slice(0, 4) !== b.kode.slice(0, 4);
                    return (
                      <text x={x} y={Number(y) + 12} textAnchor="middle" fontSize={11}>
                        <tspan fontWeight={terpilih ? 700 : 500} fill={terpilih ? "var(--color-foreground)" : "var(--color-muted-foreground)"}>
                          {namaBulanPendek(b.kode)}
                        </tspan>
                        {tahunBerganti && (
                          <tspan x={x} dy={14} fontSize={10} fill="var(--color-muted-foreground)" opacity={0.75}>
                            {b.kode.slice(0, 4)}
                          </tspan>
                        )}
                      </text>
                    );
                  }}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  width={28}
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)", fontFamily: "inherit" }}
                />
                <ChartTooltip cursor={{ fill: "var(--color-muted)", opacity: 0.6, radius: 8 }} content={TooltipKustom} />
                {tampil.map((u) => (
                  <Bar
                    key={u.kode}
                    dataKey={u.kode}
                    stackId="unit"
                    fill={`var(--color-${u.kode})`}
                    maxBarSize={44}
                    isAnimationActive={animasi}
                    animationDuration={450}
                    animationEasing="ease-out"
                    onMouseEnter={() => setFokus(u.kode)}
                  >
                    {baris.map((b) => (
                      <Cell
                        key={b.kode}
                        radius={b.puncak === u.kode ? (RADIUS_ATAS as unknown as number) : 0}
                        fillOpacity={fokus && fokus !== u.kode ? 0.3 : 1}
                        className="transition-[fill-opacity] duration-150"
                      />
                    ))}
                    <LabelList
                      dataKey="total"
                      content={({ x, y, width, index }) => {
                        const b = baris[Number(index)];
                        if (!b || b.puncak !== u.kode) return null;
                        return (
                          <text
                            x={Number(x) + Number(width) / 2}
                            y={Number(y) - 7}
                            textAnchor="middle"
                            fontSize={11}
                            fontWeight={700}
                            fill="var(--color-foreground)"
                          >
                            {b.total}
                          </text>
                        );
                      }}
                    />
                  </Bar>
                ))}
              </BarChart>
            </ChartContainer>

            <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2" aria-label="Legenda unit kerja">
              {data.unitInduk.map((u) => {
                const disembunyikan = sembunyi.has(u.kode);
                return (
                  <li key={u.kode}>
                    <button
                      type="button"
                      onClick={() => ubahSembunyi(u.kode)}
                      onMouseEnter={() => !disembunyikan && setFokus(u.kode)}
                      onMouseLeave={() => setFokus(null)}
                      onFocus={() => !disembunyikan && setFokus(u.kode)}
                      onBlur={() => setFokus(null)}
                      aria-pressed={!disembunyikan}
                      title={u.nama}
                      className={cn(
                        "group flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors duration-150",
                        "hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
                        disembunyikan && "opacity-50",
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn("size-2.5 shrink-0 rounded-full", disembunyikan && "bg-transparent! ring-1 ring-muted-foreground")}
                        style={{ backgroundColor: config[u.kode]!.color }}
                      />
                      <span className={cn("min-w-0 flex-1 truncate font-medium", disembunyikan && "line-through")}>{namaPendek(u.nama)}</span>
                      <span className="font-bold tabular-nums">{formatAngka(totalPerUnit[u.kode] ?? 0)}</span>
                      {disembunyikan ? (
                        <EyeOff aria-hidden className="size-3.5 text-muted-foreground" />
                      ) : (
                        <Eye aria-hidden className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </PanelBody>
    </Panel>
  );
}
