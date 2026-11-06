"use client";

import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatPeriode, periodeSebelumnya } from "@/lib/format";

/**
 * Pilih bulan dan tahun (12 bulan terakhir) untuk filter dashboard
 */

type PeriodePickerProps = {
  value: string;
  periodeSekarang: string;
  onChange: (periode: string) => void;
  className?: string;
};

const JUMLAH_PILIHAN = 12;

export function PeriodePicker({ value, periodeSekarang, onChange, className }: PeriodePickerProps) {
  const pilihan = periodeSebelumnya(periodeSekarang, JUMLAH_PILIHAN);
  if (!pilihan.includes(value)) pilihan.push(value);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn("h-10 w-48", className)} aria-label="Periode">
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
