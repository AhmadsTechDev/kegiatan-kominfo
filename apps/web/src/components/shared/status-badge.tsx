import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { LABEL_STATUS_AKUN, type StatusAkun } from "@/types/auth";

/**
 * Label status kegiatan, status pemeriksaan, dan status akun
 */

export type StatusPelaksanaan = "akan_datang" | "berlangsung" | "selesai" | "dibatalkan";

const KONFIGURASI: Record<StatusPelaksanaan, { label: string; kelas: string }> = {
  akan_datang: {
    label: "Akan datang",
    kelas: "bg-status-akan-datang text-status-akan-datang-foreground",
  },
  berlangsung: {
    label: "Berlangsung",
    kelas: "bg-status-berlangsung text-status-berlangsung-foreground",
  },
  selesai: {
    label: "Selesai",
    kelas: "bg-status-selesai text-status-selesai-foreground",
  },
  dibatalkan: {
    label: "Dibatalkan",
    kelas: "bg-status-dibatalkan text-status-dibatalkan-foreground",
  },
};

export function StatusBadge({ status, className }: { status: StatusPelaksanaan; className?: string }) {
  const { label, kelas } = KONFIGURASI[status];
  return (
    <Badge variant="outline" className={cn("rounded-full border-transparent font-medium", kelas, className)}>
      {label}
    </Badge>
  );
}

/**
 * "terkirim" adalah keadaan biasa kegiatan yang sudah dikirim, jadi tidak diberi lencana
 */
export type StatusPemeriksaan = "draf" | "terkirim" | "perlu_perbaikan";

const PEMERIKSAAN: Record<Exclude<StatusPemeriksaan, "terkirim">, { label: string; kelas: string }> = {
  draf: { label: "Draf", kelas: "border-dashed border-muted-foreground/50 bg-transparent text-muted-foreground" },
  perlu_perbaikan: { label: "Perlu perbaikan", kelas: "border-transparent bg-status-dibatalkan text-status-dibatalkan-foreground" },
};

export function StatusPemeriksaanBadge({ status, className }: { status: StatusPemeriksaan; className?: string }) {
  if (status === "terkirim") return null;
  const { label, kelas } = PEMERIKSAAN[status];
  return (
    <Badge variant="outline" className={cn("rounded-md font-medium", kelas, className)}>
      {label}
    </Badge>
  );
}

/**
 * Bentuk sama dengan StatusBadge (pil + teks). Warna meminjam token status yang artinya sejalan:
 * menunggu aktivasi = kuning (masih berjalan), aktif = hijau, nonaktif = netral (bukan merah, karena bukan galat)
 */
const AKUN: Record<StatusAkun, string> = {
  MENUNGGU_AKTIVASI: "bg-status-berlangsung text-status-berlangsung-foreground",
  AKTIF: "bg-status-selesai text-status-selesai-foreground",
  NONAKTIF: "bg-muted text-muted-foreground",
};

export function StatusAkunBadge({ status, className }: { status: StatusAkun; className?: string }) {
  return (
    <Badge variant="outline" className={cn("rounded-full border-transparent font-medium", AKUN[status], className)}>
      {LABEL_STATUS_AKUN[status]}
    </Badge>
  );
}
