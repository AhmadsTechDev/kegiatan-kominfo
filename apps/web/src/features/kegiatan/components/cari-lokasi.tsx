"use client";

import { MapPin, Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { cariTempat, type Tempat } from "../lib/geokode";

/**
 * Kolom cari alamat/tempat (autocomplete) untuk mendapatkan koordinat
 */

export function CariLokasi({ onPilih }: { onPilih: (t: Tempat) => void }) {
  const id = useId();
  const [kata, setKata] = useState("");
  const [hasil, setHasil] = useState<Tempat[]>([]);
  const [buka, setBuka] = useState(false);
  const [aktif, setAktif] = useState(-1);
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [untuk, setUntuk] = useState("");
  const wadah = useRef<HTMLDivElement>(null);

  /**
   * KONSEP debounce: pencarian baru dikirim 350 ms setelah pengguna BERHENTI mengetik, bukan di setiap huruf,
   * agar layanan peta tidak dibanjiri permintaan. Setiap kali `kata` berubah, efek sebelumnya dibersihkan:
   * clearTimeout membatalkan jadwal lama, dan AbortController membatalkan permintaan yang sedang berjalan,
   * sehingga hasil pencarian lama tidak menimpa hasil yang baru.
   */
  useEffect(() => {
    const q = kata.trim();
    if (q.length < 3) return;
    const batal = new AbortController();
    const tunda = setTimeout(async () => {
      setMemuat(true);
      setGalat(null);
      try {
        const h = await cariTempat(q, batal.signal);
        setHasil(h);
        setUntuk(q);
        setAktif(h.length ? 0 : -1);
      } catch (e) {
        if (!batal.signal.aborted) {
          setGalat(e instanceof Error ? e.message : "Pencarian gagal");
          setUntuk(q);
        }
      } finally {
        if (!batal.signal.aborted) setMemuat(false);
      }
    }, 350);
    return () => {
      clearTimeout(tunda);
      batal.abort();
    };
  }, [kata]);

  /**
   * Mengetuk di luar kotak pencarian menutup daftar hasil; pemasangan listener dibersihkan saat komponen hilang.
   */
  useEffect(() => {
    const tutup = (e: PointerEvent) => {
      if (!wadah.current?.contains(e.target as Node)) setBuka(false);
    };
    document.addEventListener("pointerdown", tutup);
    return () => document.removeEventListener("pointerdown", tutup);
  }, []);

  const pilih = (t: Tempat) => {
    onPilih(t);
    setKata(t.nama);
    setBuka(false);
  };

  const cukup = kata.trim().length >= 3;
  const tampilDaftar = buka && cukup;

  /**
   * `untuk` mencatat kata yang hasilnya sedang tampil; bila berbeda dengan yang diketik, berarti hasil baru masih ditunggu.
   */
  const menunggu = memuat || untuk !== kata.trim();

  return (
    <div ref={wadah} className="relative flex-1">
      <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        role="combobox"
        aria-expanded={tampilDaftar}
        aria-controls={`${id}-daftar`}
        aria-autocomplete="list"
        aria-activedescendant={tampilDaftar && aktif >= 0 ? `${id}-${aktif}` : undefined}
        aria-label="Cari tempat atau alamat"
        placeholder="Cari tempat atau alamat, mis. Kantor Walikota"
        className="h-10 pr-9 pl-9"
        value={kata}
        onChange={(e) => {
          setKata(e.target.value);
          setGalat(null);
          setBuka(true);
          if (e.target.value.trim().length < 3) setHasil([]);
        }}
        onFocus={() => setBuka(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setBuka(true);
            setAktif((i) => Math.min(i + 1, hasil.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setAktif((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (hasil[aktif]) pilih(hasil[aktif]);
          } else if (e.key === "Escape") {
            setBuka(false);
          }
        }}
      />
      <span className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center">
        {memuat ? (
          <Spinner className="mr-1 size-4 text-muted-foreground" />
        ) : (
          kata && (
            <button
              type="button"
              aria-label="Kosongkan pencarian"
              className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => {
                setKata("");
                setHasil([]);
              }}
            >
              <X className="size-3.5" />
            </button>
          )
        )}
      </span>
      {tampilDaftar && (
        <ul
          id={`${id}-daftar`}
          role="listbox"
          aria-label="Saran tempat"
          className="absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg"
        >
          {galat ? (
            <li className="px-3 py-2.5 text-sm text-destructive">{galat}. Klik langsung di peta sebagai gantinya.</li>
          ) : menunggu && !hasil.length ? (
            <li className="px-3 py-2.5 text-sm text-muted-foreground">Mencari...</li>
          ) : !hasil.length ? (
            <li className="px-3 py-2.5 text-sm text-muted-foreground">Tempat tidak ditemukan. Coba kata lain atau klik langsung di peta.</li>
          ) : (
            hasil.map((t, i) => (
              <li
                key={t.id}
                id={`${id}-${i}`}
                role="option"
                aria-selected={i === aktif}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => pilih(t)}
                onMouseEnter={() => setAktif(i)}
                className={cn("flex cursor-pointer items-start gap-2.5 rounded-lg px-2.5 py-2", i === aktif && "bg-muted")}
              >
                <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{t.nama}</span>
                  {t.alamat && <span className="block truncate text-xs text-muted-foreground">{t.alamat}</span>}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
