// =============================================================================
// KOMPONEN KARTU INDIKATOR UTAMA (KPI)
// =============================================================================
// Gunanya: Menampilkan empat kartu indikator kinerja utama (KPI) kegiatan dinas
// pada periode terpilih dalam panel dashboard Aplikasi Pendataan Kegiatan.
//
// Isi berkas:
//   - Selisih : Komponen label pembanding tren jumlah kegiatan dengan bulan lalu.
//   - KpiCards : Komponen baris penyusun empat kartu indikator utama dinas.
//
// Cara kerja:
//   1. Menerima objek data KPI dan kode periode aktif dari properti dashboard.
//   2. Menghitung selisih total kegiatan terhadap capaian bulan sebelumnya.
//   3. Merender kartu metrik total kegiatan, kegiatan berlangsung, agenda akan
//      datang, serta kegiatan selesai yang belum dilengkapi dokumen bukti.
//
// Catatan penting:
//   - Status tren kenaikan atau penurunan selalu dituliskan dalam bentuk teks
//     eksplisit ("Naik", "Turun") agar aksesibel dan tidak bergantung warna semata.
//
// Dipakai oleh: features/dashboard/components/dashboard-view.tsx
// =============================================================================

import { CalendarClock, CalendarRange, FileWarning, Minus, PlayCircle, TrendingDown, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { formatAngka, formatPeriode, periodeSebelumnya } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DashboardData } from "../types";

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
        label="Total kegiatan periode ini"
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
        keterangan="Aktif di seluruh unit kerja"
      />
      <StatCard
        className="md:col-span-3"
        label="Kegiatan akan datang"
        value={kpi.akanDatang}
        icon={CalendarClock}
        nada="akan-datang"
        keterangan="Terjadwal pada periode ini"
      />
      <StatCard
        className="md:col-span-3"
        label="Selesai tanpa dokumentasi"
        value={kpi.selesaiTanpaDokumentasi}
        icon={FileWarning}
        nada="dibatalkan"
        keterangan={kpi.selesaiTanpaDokumentasi > 0 ? "Perlu perhatian pada kelengkapan data" : "Semua sudah berdokumentasi"}
      />
    </>
  );
}
