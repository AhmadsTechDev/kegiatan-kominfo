// =============================================================================
// KOMPONEN BERSAMA DAN UTILITAS FITUR ADMINISTRASI
// =============================================================================
// Gunanya: menyediakan kumpulan komponen antarmuka bersama dan utilitas form
// yang digunakan seragam pada seluruh halaman dan dialog fitur administrasi.
//
// Isi berkas:
//   - AdminGuard : pembatas hak akses rute hanya untuk pengguna ber-role ADMIN
//   - BadgeAktif : lencana visual penanda status aktif atau nonaktif suatu data
//   - AksiBaris : tombol aksi ubah dan menu dropdown tindakan per baris tabel
//   - terapkanGalatServer : pemeta galat validasi 422 backend ke React Hook Form
//   - KolomCari : masukan pencarian data dengan mekanisme jeda ketik (debounce 300ms)
//   - PilihanTab : tombol navigasi kelompok data bergaya pil dengan lencana jumlah
//   - PilihUnit : pemilih unit kerja berjenjang dua tingkat (induk dan sub unit)
//
// Cara kerja:
//   1. AdminGuard memeriksa sesi pengguna saat ini; bila bukan ADMIN, akses diblokir.
//   2. PilihUnit memisahkan unit utama dan turunannya untuk masukan hierarki organisasi.
//   3. terapkanGalatServer mencocokkan rincian galat 422 ke kolom input form yang sesuai.
//
// Catatan penting:
//   - AdminGuard mengamankan tampilan UI, sedangkan backend tetap memvalidasi role (403).
//   - Debounce 300ms pada KolomCari mencegah pemanggilan kueri pencarian berlebihan.
//
// Dipakai oleh: akun-view.tsx, audit-log-view.tsx, hubungkan-pegawai-dialog.tsx,
//               master-view.tsx, pegawai-tab.tsx, unit-kerja-tab.tsx
// =============================================================================

"use client";

import { Ellipsis, Pencil, Power, PowerOff, Search, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { UnitKerjaAdmin } from "../types";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isPending } = useCurrentUser();
  if (isPending) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (user?.role !== "ADMIN") {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Halaman ini khusus admin."
        description="Hubungi admin aplikasi bila Anda memerlukan perubahan master data atau akun."
        className="rounded-xl border bg-card py-16"
      />
    );
  }
  return children;
}

export function BadgeAktif({ aktif, labelNonaktif = "Nonaktif" }: { aktif: boolean; labelNonaktif?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap",
        aktif ? "text-status-selesai-foreground" : "rounded-full bg-muted px-2 py-0.5 text-muted-foreground",
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", aktif ? "bg-status-selesai-foreground" : "bg-muted-foreground")} />
      {aktif ? "Aktif" : labelNonaktif}
    </span>
  );
}

export function AksiBaris({
  nama,
  aktif,
  onUbah,
  onUbahStatus,
  children,
}: {
  nama: string;
  aktif: boolean;
  onUbah: () => void;
  onUbahStatus: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-foreground" aria-label={`Ubah ${nama}`} onClick={onUbah}>
        <Pencil aria-hidden className="size-3.5" />
        Ubah
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label={`Aksi lain untuk ${nama}`}>
            <Ellipsis aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          {children}
          {aktif ? (
            <DropdownMenuItem variant="destructive" onSelect={onUbahStatus}>
              <PowerOff aria-hidden />
              Nonaktifkan
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={onUbahStatus}>
              <Power aria-hidden />
              Aktifkan kembali
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function terapkanGalatServer<T extends FieldValues>(
  e: unknown,
  setError: UseFormSetError<T>,
  petaKolom: Record<string, Path<T>>,
): string {
  if (e instanceof ApiError && e.status === 422 && e.details?.length) {
    let adaKolom = false;
    for (const d of e.details) {
      const kolom = d.field ? petaKolom[d.field] : undefined;
      if (kolom) {
        setError(kolom, { message: d.message }, { shouldFocus: !adaKolom });
        adaKolom = true;
      }
    }
    if (adaKolom) return "";
  }
  return e instanceof Error ? e.message : "Terjadi kesalahan. Coba lagi beberapa saat.";
}

export function KolomCari({
  value,
  onChange,
  placeholder,
  label,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
  className?: string;
}) {
  const [teks, setTeks] = useState(value);
  const [nilaiTerakhir, setNilaiTerakhir] = useState(value);
  if (value !== nilaiTerakhir) {
    setNilaiTerakhir(value);
    setTeks(value);
  }
  useEffect(() => {
    if (teks === value) return;
    const t = setTimeout(() => onChange(teks), 300);
    return () => clearTimeout(t);
  }, [teks, value, onChange]);

  return (
    <div className={cn("relative", className)}>
      <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        aria-label={label}
        value={teks}
        onChange={(e) => setTeks(e.target.value)}
        placeholder={placeholder}
        maxLength={100}
        className="h-10 pl-9"
      />
    </div>
  );
}

export function PilihanTab<T extends string>({
  value,
  onChange,
  opsi,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  opsi: { nilai: T; label: string; jumlah?: number }[];
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-1">
      {opsi.map((o) => (
        <Button
          key={o.nilai}
          role="tab"
          variant="ghost"
          aria-selected={value === o.nilai}
          onClick={() => onChange(o.nilai)}
          className={cn(
            "h-9 border border-transparent px-3 text-muted-foreground",
            value === o.nilai && "border-primary/30 bg-secondary text-primary hover:bg-secondary",
          )}
        >
          {o.label}
          {o.jumlah !== undefined && (
            <span className={cn("rounded-full px-1.5 text-[11px] font-semibold tabular-nums", value === o.nilai ? "bg-primary/15" : "bg-muted")}>{o.jumlah}</span>
          )}
        </Button>
      ))}
    </div>
  );
}

const LANGSUNG = "__langsung__";

export function PilihUnit({ unit, value, onChange, id, invalid }: { unit: UnitKerjaAdmin[]; value: string; onChange: (v: string) => void; id: string; invalid?: boolean }) {
  const tampil = unit.filter((u) => u.aktif || String(u.id) === value);
  const dipilih = unit.find((u) => String(u.id) === value);
  const utamaId = dipilih ? (dipilih.parentId ?? dipilih.id) : null;
  const akar = tampil.filter((u) => u.parentId === null || !unit.some((x) => x.id === u.parentId));
  const sub = utamaId ? tampil.filter((u) => u.parentId === utamaId) : [];
  const nilaiSub = !utamaId || sub.length === 0 ? "" : dipilih && dipilih.parentId !== null ? String(dipilih.id) : LANGSUNG;
  return (
    <div className="flex flex-col gap-2">
      <Select value={utamaId ? String(utamaId) : ""} onValueChange={onChange}>
        <SelectTrigger id={id} className="h-10 w-full" aria-invalid={invalid}>
          <SelectValue placeholder="Pilih unit kerja" />
        </SelectTrigger>
        <SelectContent>
          {akar.map((u) => (
            <SelectItem key={u.id} value={String(u.id)}>
              {u.nama}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="mt-1 text-xs font-medium text-muted-foreground">Sub bagian / seksi</span>
      <Select value={nilaiSub} onValueChange={(v) => onChange(v === LANGSUNG ? String(utamaId) : v)} disabled={sub.length === 0}>
        <SelectTrigger className="h-10 w-full" aria-label="Sub bagian atau seksi">
          <SelectValue placeholder={utamaId ? "Tidak ada sub bagian atau seksi" : "Pilih unit kerja dulu"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={LANGSUNG}>Langsung di unit ini</SelectItem>
          {sub.map((u) => (
            <SelectItem key={u.id} value={String(u.id)}>
              {u.nama}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
