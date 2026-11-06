"use client";

import { Clock } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// Masukan jam 24 jam (WIB) dengan pilihan per 15 menit atau diketik bebas

const dua = (n: number) => String(n).padStart(2, "0");
const PILIHAN = Array.from({ length: 96 }, (_, i) => `${dua(Math.floor(i / 4))}:${dua((i % 4) * 15)}`);
const menit = (jam: string) => Number(jam.slice(0, 2)) * 60 + Number(jam.slice(3, 5));

export function normalisasiJam(teks: string): string | null {
  const bersih = teks.trim().replace(/[.,]/g, ":");
  let j: number, m: number;
  if (bersih.includes(":")) {
    const [a, b = "0"] = bersih.split(":");
    if (!/^\d{1,2}$/.test(a!) || !/^\d{1,2}$/.test(b)) return null;
    j = Number(a);
    m = Number(b);
  } else {
    if (!/^\d{1,4}$/.test(bersih)) return null;
    j = Number(bersih.length <= 2 ? bersih : bersih.slice(0, bersih.length - 2));
    m = bersih.length <= 2 ? 0 : Number(bersih.slice(-2));
  }
  return j < 24 && m < 60 ? `${dua(j)}:${dua(m)}` : null;
}

function durasi(dari: string, ke: string) {
  const selisih = menit(ke) - menit(dari);
  if (selisih <= 0) return null;
  const j = Math.floor(selisih / 60);
  const m = selisih % 60;
  return [j && `${j} jam`, m && `${m} mnt`].filter(Boolean).join(" ");
}

type Props = {
  id?: string;
  value: string;
  onChange: (nilai: string) => void;
  onBlur?: () => void;
  invalid?: boolean;
  "aria-label"?: string;
  mulai?: string;
};

export function JamPicker({ id, value, onChange, onBlur, invalid, mulai, "aria-label": label }: Props) {
  const [buka, setBuka] = useState(false);
  const [teks, setTeks] = useState(value);
  const [nilaiTerakhir, setNilaiTerakhir] = useState(value);
  const daftar = useRef<HTMLUListElement>(null);
  const jangkar = useRef<HTMLDivElement>(null);

  if (value !== nilaiTerakhir) {
    setNilaiTerakhir(value);
    setTeks(value);
  }

  useEffect(() => {
    if (!buka) return;
    const target = value ? PILIHAN.findLast((p) => p <= value) : "08:00";
    requestAnimationFrame(() => daftar.current?.querySelector(`[data-jam="${target}"]`)?.scrollIntoView({ block: "center" }));
  }, [buka, value]);

  const simpan = (jam: string) => {
    setTeks(jam);
    onChange(jam);
  };

  const terapkanKetikan = () => {
    const jam = normalisasiJam(teks);
    if (jam) simpan(jam);
    else onChange(teks);
  };

  return (
    <Popover open={buka} onOpenChange={setBuka}>
      <PopoverAnchor asChild>
        <div ref={jangkar} className="relative">
          <Input
            id={id}
            value={teks}
            inputMode="numeric"
            autoComplete="off"
            maxLength={5}
            placeholder="08:00"
            aria-label={label}
            aria-invalid={invalid}
            aria-expanded={buka}
            className="h-10 pr-9 tabular-nums"
            onChange={(e) => setTeks(e.target.value)}
            onFocus={(e) => {
              e.target.select();
              setBuka(true);
            }}
            onClick={() => setBuka(true)}
            onBlur={() => {
              terapkanKetikan();
              onBlur?.();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                terapkanKetikan();
                setBuka(false);
              } else if (e.key === "Escape" || e.key === "Tab") {
                setBuka(false);
              }
            }}
          />
          <Clock aria-hidden className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        className="w-44 p-1"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          if (jangkar.current?.contains(e.target as Node)) e.preventDefault();
        }}
      >
        <ul ref={daftar} role="listbox" aria-label={label ?? "Pilihan jam"} className="max-h-64 overflow-y-auto">
          {PILIHAN.map((p) => {
            const lama = mulai ? durasi(mulai, p) : null;
            const dipilih = p === value;
            return (
              <li key={p}>
                <button
                  type="button"
                  role="option"
                  aria-selected={dipilih}
                  data-jam={p}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    simpan(p);
                    setBuka(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-sm tabular-nums hover:bg-muted",
                    dipilih && "bg-secondary font-semibold text-primary hover:bg-secondary",
                  )}
                >
                  {p}
                  {lama && <span className="text-xs font-normal text-muted-foreground">{lama}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
