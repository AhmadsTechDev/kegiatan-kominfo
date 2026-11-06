"use client";

import { Check, ChevronDown, Search } from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Pengganti Select untuk daftar panjang: ketik sebagian nama lalu pilih dari hasil
 */

export type OpsiCari = { nilai: string; label: string; keterangan?: string };

const MAKS_TAMPIL = 50;

const normal = (s: string) => s.toLocaleLowerCase("id-ID").normalize("NFD").replace(/\p{Diacritic}/gu, "");

export function PilihCari({
  id,
  value,
  onChange,
  opsi,
  labelSemua,
  placeholderCari,
  className,
}: {
  id?: string;
  value: string | null;
  onChange: (v: string | null) => void;
  opsi: OpsiCari[];
  labelSemua: string;
  placeholderCari: string;
  className?: string;
}) {
  const idDasar = useId();
  const idDaftar = `${idDasar}-daftar`;
  const [buka, setBuka] = useState(false);
  const [kata, setKata] = useState("");
  const [sorot, setSorot] = useState(0);
  const daftarRef = useRef<HTMLUListElement>(null);

  const terpilih = opsi.find((o) => o.nilai === value);
  const cocok = useMemo(() => {
    const kunci = normal(kata.trim()).split(/\s+/).filter(Boolean);
    if (!kunci.length) return opsi;

    /**
     * Tiap kata yang diketik harus cocok dengan awal sebuah kata ("andi" tidak mengenai "Persandian");
     * opsi yang cocok di label (nama) didahulukan dari yang hanya cocok di keterangan
     */
    const kataDari = (t: string) => normal(t).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    const kena = (daftar: string[]) => kunci.every((k) => daftar.some((w) => w.startsWith(k)));
    const diLabel: OpsiCari[] = [];
    const diKeterangan: OpsiCari[] = [];
    for (const o of opsi) {
      const label = kataDari(o.label);
      if (kena(label)) diLabel.push(o);
      else if (kena([...label, ...kataDari(o.keterangan ?? "")])) diKeterangan.push(o);
    }
    return [...diLabel, ...diKeterangan];
  }, [opsi, kata]);
  const tampil = cocok.slice(0, MAKS_TAMPIL);

  /**
   * Indeks 0 adalah opsi "semua"; hasil pencarian mulai indeks 1
   */
  const butir: (OpsiCari | null)[] = [null, ...tampil];

  const pilih = (o: OpsiCari | null) => {
    onChange(o?.nilai ?? null);
    setBuka(false);
  };

  const geser = (arah: number) => {
    const baru = Math.min(Math.max(sorot + arah, 0), butir.length - 1);
    setSorot(baru);
    daftarRef.current?.querySelector(`[data-indeks="${baru}"]`)?.scrollIntoView({ block: "nearest" });
  };

  return (
    <Popover
      open={buka}
      onOpenChange={(v) => {
        setBuka(v);
        if (v) {
          setKata("");
          setSorot(terpilih ? Math.max(1, opsi.indexOf(terpilih) + 1) : 0);
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          className={cn(
            "flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 text-left text-sm transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none pointer-coarse:min-h-11 dark:bg-input/30",
            className,
          )}
        >
          <span className={cn("truncate", !terpilih && "text-foreground")}>{terpilih?.label ?? labelSemua}</span>
          <ChevronDown aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) min-w-72 gap-0 p-0">
        <div className="relative border-b">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            role="combobox"
            aria-expanded
            aria-controls={idDaftar}
            aria-activedescendant={`${idDasar}-opsi-${sorot}`}
            aria-autocomplete="list"
            aria-label={placeholderCari}
            autoFocus
            value={kata}
            onChange={(e) => {
              setKata(e.target.value);
              setSorot(e.target.value.trim() ? 1 : 0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                geser(1);
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                geser(-1);
              } else if (e.key === "Enter") {
                e.preventDefault();
                if (sorot < butir.length) pilih(butir[sorot] ?? null);
              }
            }}
            placeholder={placeholderCari}
            className="h-11 w-full bg-transparent pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <ul ref={daftarRef} id={idDaftar} role="listbox" aria-label={placeholderCari} className="max-h-72 overflow-y-auto p-1">
          {butir.map((o, i) => {
            const dipilih = o ? o.nilai === value : value === null;
            return (
              <li
                key={o?.nilai ?? "__semua"}
                id={`${idDasar}-opsi-${i}`}
                data-indeks={i}
                role="option"
                aria-selected={dipilih}
                onMouseEnter={() => setSorot(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pilih(o)}
                className={cn(
                  "flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm pointer-coarse:py-2.5",
                  i === sorot && "bg-muted",
                  i === 0 && "font-medium",
                )}
              >
                <Check aria-hidden className={cn("mt-0.5 size-4 shrink-0 text-primary", !dipilih && "invisible")} />
                <span className="min-w-0">
                  <span className="block truncate">{o?.label ?? labelSemua}</span>
                  {o?.keterangan && <span className="block truncate text-xs text-muted-foreground">{o.keterangan}</span>}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="border-t px-3 py-2 text-xs text-muted-foreground" aria-live="polite">
          {cocok.length === 0
            ? "Tidak ada yang cocok."
            : cocok.length > MAKS_TAMPIL
              ? `Menampilkan ${MAKS_TAMPIL} dari ${cocok.length}. Ketik lebih spesifik untuk mempersempit.`
              : `${cocok.length} pilihan`}
        </p>
      </PopoverContent>
    </Popover>
  );
}
