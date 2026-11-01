// =============================================================================
// PEMILIH RENTANG TANGGAL KALENDER
// =============================================================================
// Gunanya: Menyediakan kontrol pemilihan rentang tanggal kalender dilengkapi
//          menu tombol pintas pilihan cepat (hari ini, bulan ini, tahun ini).
//
// Isi berkas:
//   - labelRentang         : pembuat teks label pembacaan rentang tanggal terpilih
//   - RentangTanggalPicker : komponen popover pemilih rentang tanggal kalender
//
// Cara kerja:
//   1. Menampilkan tombol pemicu dengan label rentang aktif atau placeholder.
//   2. Membuka popover yang berisi daftar pilihan cepat dan kalender ganda.
//   3. Menghitung tanggal pilihan cepat berbasis waktu WIB saat tombol diklik.
//   4. Mengirimkan nilai rentang string "YYYY-MM-DD" ke callback onChange.
//
// Catatan penting:
//   - Nilai tanggal dikelola sebagai string kalender WIB "YYYY-MM-DD" untuk
//     mencegah distorsi akibat perbedaan zona waktu perangkat lokal pengguna.
//   - Opsi bolehKosong memungkinkan pemaksaan rentang wajib (misal untuk laporan).
//
// Dipakai oleh: filter-bar.tsx (penyaring kegiatan) dan modul laporan kegiatan
// =============================================================================

"use client";

import { CalendarRange, X } from "lucide-react";
import { useState } from "react";
import { id as localeId } from "react-day-picker/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatTanggal, tanggalWib } from "@/lib/format";
import { cn } from "@/lib/utils";
import { keDate, keString } from "./date-picker";

export type RentangTanggal = { dari: string | null; sampai: string | null };

const tampil = (t: string) => formatTanggal(`${t}T12:00:00+07:00`);

export function labelRentang({ dari, sampai }: RentangTanggal, kosong = "Semua tanggal") {
  if (dari && sampai) return dari === sampai ? tampil(dari) : `${tampil(dari)} – ${tampil(sampai)}`;
  if (dari) return `Sejak ${tampil(dari)}`;
  if (sampai) return `Sampai ${tampil(sampai)}`;
  return kosong;
}

const geser = (t: string, hari: number) => {
  const d = keDate(t);
  d.setDate(d.getDate() + hari);
  return keString(d);
};
const PILIHAN_CEPAT: { label: string; hitung: (hariIni: string) => RentangTanggal }[] = [
  { label: "Hari ini", hitung: (h) => ({ dari: h, sampai: h }) },
  { label: "7 hari terakhir", hitung: (h) => ({ dari: geser(h, -6), sampai: h }) },
  { label: "Bulan ini", hitung: (h) => ({ dari: `${h.slice(0, 8)}01`, sampai: h }) },
  {
    label: "Bulan lalu",
    hitung: (h) => {
      const akhir = geser(`${h.slice(0, 8)}01`, -1);
      return { dari: `${akhir.slice(0, 8)}01`, sampai: akhir };
    },
  },
  { label: "Tahun ini", hitung: (h) => ({ dari: `${h.slice(0, 4)}-01-01`, sampai: h }) },
];

type Props = {
  id?: string;
  value: RentangTanggal;
  onChange: (nilai: RentangTanggal) => void;
  placeholder?: string;
  bolehKosong?: boolean;
  className?: string;
};

export function RentangTanggalPicker({ id, value, onChange, placeholder = "Semua tanggal", bolehKosong = true, className }: Props) {
  const [buka, setBuka] = useState(false);
  const terpilih = { from: value.dari ? keDate(value.dari) : undefined, to: value.sampai ? keDate(value.sampai) : undefined };
  const kosong = !value.dari && !value.sampai;

  const pilih = (nilai: RentangTanggal) => {
    onChange(nilai);
    setBuka(false);
  };

  return (
    <Popover open={buka} onOpenChange={setBuka}>
      <PopoverTrigger asChild>
        <Button id={id} type="button" variant="outline" className={cn("h-10 w-full justify-start font-normal", kosong && "text-muted-foreground", className)}>
          <CalendarRange aria-hidden />
          <span className="truncate">{labelRentang(value, placeholder)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="flex w-auto flex-col p-0 sm:flex-row" align="start">
        <div className="flex flex-wrap gap-1 border-b p-2 sm:w-40 sm:flex-col sm:flex-nowrap sm:border-r sm:border-b-0" aria-label="Pilihan cepat">
          {PILIHAN_CEPAT.map((p) => (
            <Button key={p.label} type="button" variant="ghost" size="sm" className="h-8 justify-start text-xs" onClick={() => pilih(p.hitung(tanggalWib(new Date())))}>
              {p.label}
            </Button>
          ))}
          {bolehKosong && (
            <Button type="button" variant="ghost" size="sm" className="h-8 justify-start text-xs text-muted-foreground" onClick={() => pilih({ dari: null, sampai: null })} disabled={kosong}>
              <X aria-hidden className="size-3.5" />
              Semua tanggal
            </Button>
          )}
        </div>
        <Calendar
          mode="range"
          locale={localeId}
          selected={terpilih}
          defaultMonth={terpilih.from}
          captionLayout="dropdown"
          onSelect={(r) => {
            if (!r?.from) return;
            const nilai = { dari: keString(r.from), sampai: keString(r.to ?? r.from) };
            onChange(nilai);
            if (r.to && r.to.getTime() !== r.from.getTime()) setBuka(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
