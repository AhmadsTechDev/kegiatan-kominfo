"use client";

import { CalendarDays } from "lucide-react";
import { useState } from "react";
import { id as localeId } from "react-day-picker/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatTanggal } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Pemilih satu tanggal (popover kalender, format Indonesia)
 */

export const keDate = (nilai: string) => {
  const [t, b, h] = nilai.split("-").map(Number);
  return new Date(t!, b! - 1, h!);
};

export const keString = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

type DatePickerProps = {
  id?: string;
  value: string;
  onChange: (nilai: string) => void;
  invalid?: boolean;
  placeholder?: string;
  className?: string;
};

export function DatePicker({ id, value, onChange, invalid, placeholder = "Pilih tanggal", className }: DatePickerProps) {
  const [buka, setBuka] = useState(false);
  const terpilih = value ? keDate(value) : undefined;

  return (
    <Popover open={buka} onOpenChange={setBuka}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          aria-invalid={invalid}
          className={cn("h-10 w-full justify-start font-normal", !value && "text-muted-foreground", className)}
        >
          <CalendarDays aria-hidden />
          {value ? formatTanggal(`${value}T12:00:00+07:00`) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          locale={localeId}
          selected={terpilih}
          defaultMonth={terpilih}
          captionLayout="dropdown"
          onSelect={(d) => {
            if (!d) return;
            onChange(keString(d));
            setBuka(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
