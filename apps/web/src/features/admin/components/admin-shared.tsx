"use client";

import { Ellipsis, Pencil, Power, PowerOff, ShieldAlert, Trash2 } from "lucide-react";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import { ApiError } from "@/lib/api-client";
import { tabIndexPilihan, tanganiPanah } from "@/utils/navigasi-panah";
import { cn } from "@/utils/cn";
import type { BidangAdmin } from "../types";

const LANGSUNG = "__langsung__";

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
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        aktif ? "bg-status-selesai text-status-selesai-foreground" : "bg-muted text-muted-foreground",
      )}
    >
      {aktif ? "Aktif" : labelNonaktif}
    </span>
  );
}

export function AksiBaris({
  nama,
  aktif,
  onUbah,
  onUbahStatus,
  onHapus,
  children,
}: {
  nama: string;
  aktif: boolean;
  onUbah: () => void;
  onUbahStatus: () => void;
  onHapus?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-foreground pointer-coarse:h-11 pointer-coarse:px-3" aria-label={`Ubah ${nama}`} onClick={onUbah}>
        <Pencil aria-hidden className="size-3.5" />
        Ubah
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8 text-muted-foreground pointer-coarse:size-11" aria-label={`Aksi lain untuk ${nama}`}>
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
          {onHapus && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={onHapus}>
                <Trash2 aria-hidden />
                Hapus
              </DropdownMenuItem>
            </>
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

export { KolomCari } from "@/components/common/kolom-cari";

export const idTab = (idPanel: string, nilai: string) => `${idPanel}-tab-${nilai}`;

export function PilihanTab<T extends string>({
  value,
  onChange,
  opsi,
  label,
  idPanel,
}: {
  value: T;
  onChange: (v: T) => void;
  opsi: { nilai: T; label: string; lencana?: number }[];
  label: string;
  idPanel?: string;
}) {
  const nilai = opsi.map((o) => o.nilai);

  return (
    <div role="tablist" aria-label={label} className="relative flex flex-wrap gap-1 py-0.5" onKeyDown={(e) => tanganiPanah(e, nilai, value, onChange)}>
      {opsi.map((o) => (
        <Button
          key={o.nilai}
          role="tab"
          variant="ghost"
          id={idPanel ? idTab(idPanel, o.nilai) : undefined}
          aria-controls={idPanel}
          aria-selected={value === o.nilai}
          tabIndex={tabIndexPilihan(o.nilai, value, nilai[0])}
          onClick={() => onChange(o.nilai)}
          className={cn(
            "h-9 shrink-0 border border-transparent px-3 whitespace-nowrap text-muted-foreground pointer-coarse:min-h-11",
            value === o.nilai && "border-primary/30 bg-secondary text-primary hover:bg-secondary",
          )}
        >
          {o.label}
          {!!o.lencana && (
            <span className="min-w-5 rounded-full bg-destructive px-1.5 text-center text-xs font-semibold text-destructive-foreground tabular-nums">
              <span className="sr-only">, </span>
              {o.lencana}
              <span className="sr-only"> menunggu</span>
            </span>
          )}
        </Button>
      ))}
    </div>
  );
}

export function PilihUnit({ unit, value, onChange, id, invalid, required }: { unit: BidangAdmin[]; value: string; onChange: (v: string) => void; id: string; invalid?: boolean; required?: boolean }) {
  const tampil = unit.filter((u) => u.aktif || String(u.id) === value);
  const dipilih = unit.find((u) => String(u.id) === value);
  const utamaId = dipilih ? (dipilih.parentId ?? dipilih.id) : null;
  const akar = tampil.filter((u) => u.parentId === null || !unit.some((x) => x.id === u.parentId));
  const sub = utamaId ? tampil.filter((u) => u.parentId === utamaId) : [];
  const nilaiSub = !utamaId || sub.length === 0 ? "" : dipilih && dipilih.parentId !== null ? String(dipilih.id) : LANGSUNG;
  return (
    <div className="flex flex-col gap-2">
      <Select value={utamaId ? String(utamaId) : ""} onValueChange={onChange}>
        <SelectTrigger id={id} className="h-10 w-full" aria-invalid={invalid} aria-required={required}>
          <SelectValue placeholder="Pilih bidang" />
        </SelectTrigger>
        <SelectContent>
          {akar.map((u) => (
            <SelectItem key={u.id} value={String(u.id)}>
              {u.nama}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="mt-1 text-xs font-medium text-muted-foreground">Sub bidang</span>
      <Select value={nilaiSub} onValueChange={(v) => onChange(v === LANGSUNG ? String(utamaId) : v)} disabled={sub.length === 0}>
        <SelectTrigger className="h-10 w-full" aria-label="Sub bidang">
          <SelectValue placeholder={utamaId ? "Tidak ada sub bidang" : "Pilih bidang dulu"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={LANGSUNG}>Tanpa sub bidang</SelectItem>
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

export function KartuMaster({ judul, aksi, children }: { judul: React.ReactNode; aksi: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 font-semibold break-words">{judul}</div>
        <div className="shrink-0">{aksi}</div>
      </div>
      {children}
    </div>
  );
}

export function TombolUbah({ nama, onClick }: { nama: string; onClick: () => void }) {
  return (
    <div className="flex items-center justify-end">
      <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-foreground pointer-coarse:h-11 pointer-coarse:px-3" aria-label={`Ubah ${nama}`} onClick={onClick}>
        <Pencil aria-hidden className="size-3.5" />
        Ubah
      </Button>
    </div>
  );
}
