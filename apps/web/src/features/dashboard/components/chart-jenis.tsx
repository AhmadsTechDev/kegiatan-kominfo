// =============================================================================
// KOMPONEN GRAFIK SEBARAN JENIS KEGIATAN
// =============================================================================
// Gunanya: Menampilkan visualisasi proporsi dan jumlah kegiatan berdasarkan jenis
// menggunakan bilah progres horizontal dalam Aplikasi Pendataan Kegiatan.
//
// Isi berkas:
//   - ChartJenis : Komponen panel visualisasi sebaran jenis kegiatan dinas.
//
// Cara kerja:
//   1. Menghitung nilai maksimum dan total akumulasi seluruh jenis kegiatan.
//   2. Menghitung persentase pangsa tiap jenis terhadap total dan nilai teratas.
//   3. Merender daftar bilah progres beranimasi beserta angka dan persentase.
//   4. Menampilkan kalimat ringkasan jenis kegiatan yang paling sering diadakan
//      langsung di bawah daftar. Jenis aktif tanpa kegiatan tampil dengan angka 0.
//
// Catatan penting:
//   - Format batang horizontal dipilih dibanding donat agar perbandingan kuantitas
//     lebih mudah dibaca (DESIGN.md bagian 5.2).
//   - Menggunakan palet Diskominfo (navy dan emas); angka selalu dicantumkan
//     eksplisit agar pemahaman data tidak bergantung pada persepsi warna.
//
// Dipakai oleh: features/dashboard/components/dashboard-view.tsx
// =============================================================================

import { Lightbulb, PieChart } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/shared/panel";
import { formatAngka } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DashboardData } from "../types";

const WARNA = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5", "bg-chart-6"];
const WARNA_TEKS = [
  "text-chart-1",
  "text-chart-2",
  "text-chart-3",
  "text-chart-4",
  "text-chart-5",
  "text-chart-6",
];

export function ChartJenis({
  data,
  animasi,
  className,
}: {
  data: DashboardData["sebaranJenis"];
  animasi: boolean;
  className?: string;
}) {
  const maks = Math.max(1, ...data.map((d) => d.jumlah));
  const total = data.reduce((a, d) => a + d.jumlah, 0);
  const pangsa = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));
  const teratas = data.filter((d) => d.jumlah === maks && maks > 0);

  return (
    <Panel className={cn("@container", className)}>
      <PanelHeader title="Sebaran jenis kegiatan" description="Komposisi periode terpilih, dari yang terbanyak" />
      <PanelBody className="flex flex-col gap-5">
        {total === 0 ? (
          <EmptyState icon={PieChart} title="Belum ada kegiatan pada periode ini." />
        ) : (
          <ul className="grid gap-3.5 pt-1 @3xl:grid-cols-2 @3xl:gap-x-10" aria-label="Jumlah kegiatan per jenis">
            {data.map((d, i) => {
              const persen = Math.round((d.jumlah / maks) * 100);
              return (
                <li key={d.id} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2 text-sm text-foreground">
                      <span
                        aria-hidden
                        className={cn("size-2 shrink-0 rounded-full", WARNA[i % WARNA.length])}
                      />
                      <span className="truncate font-medium">{d.nama}</span>
                    </span>
                    <span className="flex shrink-0 items-baseline gap-2 tabular-nums">
                      <span className="text-xs text-muted-foreground">{pangsa(d.jumlah)}%</span>
                      <span className={cn("text-sm font-bold", WARNA_TEKS[i % WARNA_TEKS.length])}>{formatAngka(d.jumlah)}</span>
                    </span>
                  </div>
                  <div aria-hidden className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full transition-all", WARNA[i % WARNA.length], animasi && "animate-tumbuh-x")}
                      style={{
                        width: `${persen}%`,
                        animationDelay: animasi ? `${i * 50}ms` : undefined,
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {teratas.length > 0 && (
          <p className="flex gap-2 rounded-lg bg-secondary/70 p-3 text-xs text-secondary-foreground">
            <Lightbulb aria-hidden className="mt-px size-4 shrink-0" />
            <span>
              <span className="font-semibold">{teratas.map((d) => d.nama).join(" dan ")}</span>{" "}
              {teratas.length > 1 ? "paling sering dilaksanakan, masing-masing" : "paling sering dilaksanakan:"}{" "}
              {formatAngka(maks)} dari {formatAngka(total)} kegiatan ({pangsa(maks)}%) pada periode ini.
            </span>
          </p>
        )}
      </PanelBody>
      {total > 0 && (
        <PanelFooter>
          <span>Total seluruh jenis</span>
          <span className="font-semibold text-foreground tabular-nums">{formatAngka(total)} kegiatan</span>
        </PanelFooter>
      )}
    </Panel>
  );
}
