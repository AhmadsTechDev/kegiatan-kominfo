// =============================================================================
// KOMPONEN PEMILIH PERIODE BULAN DASHBOARD
// =============================================================================
// Gunanya: Menyediakan dropdown pemilihan bulan dan tahun untuk memfilter data
// kegiatan dinas, dengan riwayat 12 bulan terakhir serta periode dari URL.
//
// Isi berkas:
//   - PeriodePicker : Dropdown seleksi periode berbasis komponen Select.
//
// Dipakai oleh: features/dashboard/components/dashboard-view.tsx
// =============================================================================

"use client";

import { CalendarDays } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatPeriode, periodeSebelumnya } from "@/lib/format";

type PeriodePickerProps = {
  value: string;
  periodeSekarang: string;
  onChange: (periode: string) => void;
};

const JUMLAH_PILIHAN = 12;

export function PeriodePicker({ value, periodeSekarang, onChange }: PeriodePickerProps) {
  const pilihan = periodeSebelumnya(periodeSekarang, JUMLAH_PILIHAN);
  if (!pilihan.includes(value)) pilihan.push(value);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-10 w-48" aria-label="Periode">
        <CalendarDays aria-hidden className="text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {pilihan.map((kode) => (
          <SelectItem key={kode} value={kode}>
            {formatPeriode(kode, true)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
