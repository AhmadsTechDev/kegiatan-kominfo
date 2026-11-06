import { CalendarClock, CalendarRange, CheckCircle2, Minus, PlayCircle, TrendingDown, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { formatAngka, formatPeriode, periodeSebelumnya } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DashboardData } from "../types";

// Empat kartu KPI kegiatan untuk periode terpilih

function Selisih({ sekarang, sebelumnya, periode }: { sekarang: number; sebelumnya: number; periode: string }) {
  const bulanLalu = formatPeriode(periodeSebelumnya(periode, 2)[1]!);
  const selisih = sekarang - sebelumnya;
  const Ikon = selisih > 0 ? TrendingUp : selisih < 0 ? TrendingDown : Minus;
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span
        className={cn(
          "inline-flex items-center gap-1 font-bold",
          selisih > 0 && "text-status-selesai-foreground",
          selisih < 0 && "text-status-dibatalkan-foreground",
        )}
      >
        <Ikon aria-hidden className="size-3.5" />
        {selisih === 0 ? "Sama" : `${selisih > 0 ? "Naik" : "Turun"} ${formatAngka(Math.abs(selisih))}`}
      </span>
      dibanding {bulanLalu}
    </span>
  );
}

export function KpiCards({ data }: { data: DashboardData }) {
  const { kpi, periode } = data;
  return (
    <>
      <StatCard
        className="md:col-span-3"
        label="Total kegiatan"
        value={kpi.total}
        icon={CalendarRange}
        keterangan={<Selisih sekarang={kpi.total} sebelumnya={kpi.totalPeriodeSebelumnya} periode={periode} />}
      />
      <StatCard
        className="md:col-span-3"
        label="Sedang berlangsung"
        value={kpi.berlangsung}
        icon={PlayCircle}
        nada="berlangsung"
        keterangan="Aktif di seluruh bidang"
      />
      <StatCard
        className="md:col-span-3"
        label="Akan datang"
        value={kpi.akanDatang}
        icon={CalendarClock}
        nada="akan-datang"
        keterangan="Terjadwal pada periode ini"
      />
      <StatCard
        className="md:col-span-3"
        label="Selesai"
        value={kpi.selesai}
        icon={CheckCircle2}
        nada="selesai"
        keterangan={kpi.selesai === 0 ? "Belum ada yang selesai" : "Tuntas pada periode ini"}
      />
    </>
  );
}
