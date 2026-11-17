import { Badge } from "@/components/ui/badge";
import { LABEL_STATUS_AKUN, type StatusAkun } from "@/types/auth";
import { cn } from "@/utils/cn";

export type StatusPelaksanaan = "akan_datang" | "berlangsung" | "selesai" | "dibatalkan";
export type StatusPemeriksaan = "draf" | "terkirim" | "perlu_perbaikan";

const KELAS_STATUS: Record<StatusPelaksanaan, string> = {
  akan_datang: "bg-status-akan-datang text-status-akan-datang-foreground",
  berlangsung: "bg-status-berlangsung text-status-berlangsung-foreground",
  selesai: "bg-status-selesai text-status-selesai-foreground",
  dibatalkan: "bg-status-dibatalkan text-status-dibatalkan-foreground",
};

const PEMERIKSAAN: Record<Exclude<StatusPemeriksaan, "terkirim">, { label: string; kelas: string }> = {
  draf: { label: "Draf", kelas: "border-dashed border-muted-foreground/50 bg-transparent text-muted-foreground" },
  perlu_perbaikan: { label: "Perlu perbaikan", kelas: "border-transparent bg-status-dibatalkan text-status-dibatalkan-foreground" },
};

const AKUN: Record<StatusAkun, string> = {
  MENUNGGU_AKTIVASI: "bg-status-berlangsung text-status-berlangsung-foreground",
  AKTIF: "bg-status-selesai text-status-selesai-foreground",
  NONAKTIF: "bg-muted text-muted-foreground",
};

export const LABEL_STATUS: Record<StatusPelaksanaan, string> = {
  akan_datang: "Akan datang",
  berlangsung: "Berlangsung",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

export function StatusBadge({ status, className }: { status: StatusPelaksanaan; className?: string }) {
  return (
    <Badge variant="outline" className={cn("rounded-full border-transparent font-medium", KELAS_STATUS[status], className)}>
      {LABEL_STATUS[status]}
    </Badge>
  );
}

export function StatusPemeriksaanBadge({ status, className }: { status: StatusPemeriksaan; className?: string }) {
  if (status === "terkirim") return null;
  const { label, kelas } = PEMERIKSAAN[status];
  return (
    <Badge variant="outline" className={cn("rounded-md font-medium", kelas, className)}>
      {label}
    </Badge>
  );
}

export function StatusAkunBadge({ status, className }: { status: StatusAkun; className?: string }) {
  return (
    <Badge variant="outline" className={cn("rounded-full border-transparent font-medium", AKUN[status], className)}>
      {LABEL_STATUS_AKUN[status]}
    </Badge>
  );
}
