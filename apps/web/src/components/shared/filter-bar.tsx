// =============================================================================
// BILAH PENYARING DAFTAR KEGIATAN
// =============================================================================
// Gunanya: Menyediakan panel interaktif untuk menyaring daftar kegiatan menurut
//          kata kunci, rentang tanggal, unit kerja, jenis, dan status pelaksanaan.
//
// Isi berkas:
//   - urutPohon : fungsi penyusun hierarki pohon unit kerja (induk dan anak)
//   - FilterBar : komponen bilah filter kegiatan dengan pencarian ber-debounce
//
// Cara kerja:
//   1. Menampung teks pencarian dan mendebounce perubahan selama 300 ms.
//   2. Mengurutkan opsi unit kerja secara hierarkis sebelum ditampilkan di dropdown.
//   3. Mengirim pembaruan kriteria filter ke komponen induk melalui callback onChange.
//   4. Menyediakan tombol atur ulang untuk mengembalikan semua filter ke awal.
//
// Catatan penting:
//   - Sesuai DESIGN.md bagian 4.2 dan 5.3, pada layar seluler filter tambahan
//     dapat diciutkan agar daftar kegiatan langsung terlihat tanpa terhalang.
//
// Dipakai oleh: Halaman daftar kegiatan (kegiatan-list-view.tsx)
// =============================================================================

"use client";

import { RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useId, useState } from "react";
import type { StatusPelaksanaan } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { RentangTanggalPicker } from "./rentang-tanggal-picker";

export type NilaiFilter = {
  q: string;
  dari: string | null;
  sampai: string | null;
  unit: string | null;
  jenis: string | null;
  status: StatusPelaksanaan | null;
  pegawai?: string | null;
};

type FilterBarProps = {
  value: NilaiFilter;
  onChange: (ubah: Partial<NilaiFilter>) => void;
  onReset: () => void;
  adaFilter: boolean;
  unitKerja: { id: number; parentId: number | null; nama: string }[];
  jenisKegiatan: { id: number; nama: string }[];
  className?: string;
};

const SEMUA = "semua";
const JEDA_CARI_MS = 300;

const LABEL_STATUS: Record<StatusPelaksanaan, string> = {
  akan_datang: "Akan datang",
  berlangsung: "Berlangsung",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

function urutPohon(unit: FilterBarProps["unitKerja"]) {
  return unit
    .filter((u) => u.parentId === null)
    .flatMap((induk) => [
      { ...induk, turunan: false },
      ...unit.filter((u) => u.parentId === induk.id).map((u) => ({ ...u, turunan: true })),
    ]);
}

export function FilterBar({ value, onChange, onReset, adaFilter, unitKerja, jenisKegiatan, className }: FilterBarProps) {
  const id = useId();
  const [bukaFilter, setBukaFilter] = useState(false);
  const jumlahAktif = [value.dari ?? value.sampai, value.unit, value.jenis, value.status].filter((v) => v != null).length;
  const [teks, setTeks] = useState(value.q);
  const [qTerakhir, setQTerakhir] = useState(value.q);

  if (value.q !== qTerakhir) {
    setQTerakhir(value.q);
    setTeks(value.q);
  }

  useEffect(() => {
    if (teks === value.q) return;
    const t = setTimeout(() => onChange({ q: teks }), JEDA_CARI_MS);
    return () => clearTimeout(t);
  }, [teks, value.q, onChange]);

  const label = "text-xs font-bold text-foreground/80";
  const adaUnit = unitKerja.length > 1;

  return (
    <div
      role="search"
      aria-label="Filter kegiatan"
      className={cn(
        "grid grid-cols-2 items-end gap-3 sm:grid-cols-4",
        adaUnit ? "lg:grid-cols-[minmax(12rem,1.5fr)_repeat(4,minmax(8rem,1fr))_auto]" : "lg:grid-cols-[minmax(12rem,1.5fr)_repeat(3,minmax(8rem,1fr))_auto]",
        className,
      )}
    >
      <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-4 lg:col-span-1">
        <label htmlFor={`${id}-q`} className={label}>
          Pencarian
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id={`${id}-q`}
              type="search"
              value={teks}
              onChange={(e) => setTeks(e.target.value)}
              placeholder="Judul, lokasi, atau uraian..."
              maxLength={100}
              className="h-10 pl-9"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className={cn("h-10 shrink-0 sm:hidden", jumlahAktif > 0 && "border-primary/40 text-primary")}
            aria-expanded={bukaFilter}
            aria-controls={`${id}-lanjutan`}
            onClick={() => setBukaFilter((v) => !v)}
          >
            <SlidersHorizontal aria-hidden />
            Filter{jumlahAktif > 0 ? ` (${jumlahAktif})` : ""}
          </Button>
        </div>
      </div>

      <div
        id={`${id}-lanjutan`}
        className={cn("col-span-2 grid grid-cols-2 items-end gap-3 sm:contents", !bukaFilter && "max-sm:hidden")}
      >
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor={`${id}-tanggal`} className={label}>
            Tanggal
          </label>
          <RentangTanggalPicker id={`${id}-tanggal`} value={{ dari: value.dari, sampai: value.sampai }} onChange={onChange} />
        </div>

        {adaUnit && (
          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor={`${id}-unit`} className={label}>
              Unit kerja
            </label>
            <Select value={value.unit ?? SEMUA} onValueChange={(v) => onChange({ unit: v === SEMUA ? null : v })}>
              <SelectTrigger id={`${id}-unit`} className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SEMUA}>Semua unit kerja</SelectItem>
                {urutPohon(unitKerja).map((u) => (
                  <SelectItem key={u.id} value={String(u.id)} className={cn(u.turunan && "pl-6 text-muted-foreground")}>
                    {u.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor={`${id}-jenis`} className={label}>
            Jenis
          </label>
          <Select value={value.jenis ?? SEMUA} onValueChange={(v) => onChange({ jenis: v === SEMUA ? null : v })}>
            <SelectTrigger id={`${id}-jenis`} className="h-10 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SEMUA}>Semua jenis</SelectItem>
              {jenisKegiatan.map((j) => (
                <SelectItem key={j.id} value={String(j.id)}>
                  {j.nama}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor={`${id}-status`} className={label}>
            Status
          </label>
          <Select
            value={value.status ?? SEMUA}
            onValueChange={(v) => onChange({ status: v === SEMUA ? null : (v as StatusPelaksanaan) })}
          >
            <SelectTrigger id={`${id}-status`} className="h-10 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SEMUA}>Semua status</SelectItem>
              {(Object.keys(LABEL_STATUS) as StatusPelaksanaan[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {LABEL_STATUS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button variant="outline" className="col-span-2 h-10 sm:col-span-4 lg:col-span-1" onClick={onReset} disabled={!adaFilter}>
          <RotateCcw aria-hidden />
          Atur ulang
        </Button>
      </div>
    </div>
  );
}
