// =============================================================================
// LENCANA STATUS KEGIATAN, PEMERIKSAAN, DAN AKUN (STATUS BADGE)
// =============================================================================
// Gunanya: Menampilkan label status pelaksanaan kegiatan dan status pemeriksaan
// pimpinan, dan status akun pengguna secara visual pada Aplikasi Pendataan Kegiatan.
//
// Isi berkas:
//   - StatusBadge            : lencana bentuk pil untuk status pelaksanaan kegiatan
//   - labelPemeriksaan       : fungsi pemetaan teks label status pemeriksaan pimpinan
//   - StatusPemeriksaanBadge : lencana bentuk kotak untuk status pemeriksaan pimpinan
//   - StatusAkunBadge        : lencana bentuk pil untuk status akun (menunggu aktivasi, aktif, nonaktif)
//
// Catatan penting:
//   - Status pelaksanaan dihitung oleh backend; antarmuka hanya memetakan tampilannya.
//   - Lencana pemeriksaan berbentuk kotak agar tidak tertukar dengan status pelaksanaan.
//   - Teks status selalu dicantumkan agar pemahaman status tidak bergantung pada warna.
//
// Dipakai oleh: Tabel daftar kegiatan, tampilan detail kegiatan, modul pimpinan, manajemen akun, dan Pengaturan
// =============================================================================

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { LABEL_STATUS_AKUN, type StatusAkun } from "@/types/auth";

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
    <Badge variant="outline" className={cn("gap-1.5 rounded-full border-transparent font-medium", kelas, className)}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {label}
    </Badge>
  );
}

export type StatusPemeriksaan = "draf" | "terkirim" | "diperiksa" | "perlu_perbaikan";

const PEMERIKSAAN: Record<StatusPemeriksaan, { label: string; kelas: string }> = {
  draf: { label: "Draf", kelas: "border-dashed border-muted-foreground/50 bg-transparent text-muted-foreground" },
  terkirim: { label: "Belum diperiksa", kelas: "border-transparent bg-muted text-muted-foreground" },
  diperiksa: { label: "Sudah diperiksa", kelas: "border-transparent bg-status-selesai text-status-selesai-foreground" },
  perlu_perbaikan: { label: "Perlu perbaikan", kelas: "border-transparent bg-status-dibatalkan text-status-dibatalkan-foreground" },
};

export const labelPemeriksaan = (status: StatusPemeriksaan) => PEMERIKSAAN[status].label;

export function StatusPemeriksaanBadge({ status, className }: { status: StatusPemeriksaan; className?: string }) {
  const { label, kelas } = PEMERIKSAAN[status];
  return (
    <Badge variant="outline" className={cn("rounded-md font-medium", kelas, className)}>
      {label}
    </Badge>
  );
}

// Bentuk sama dengan StatusBadge (pil + titik + teks). Warna meminjam token status yang artinya sejalan:
// menunggu aktivasi = kuning (masih berjalan), aktif = hijau, nonaktif = netral (bukan merah, karena bukan galat)
const AKUN: Record<StatusAkun, string> = {
  MENUNGGU_AKTIVASI: "bg-status-berlangsung text-status-berlangsung-foreground",
  AKTIF: "bg-status-selesai text-status-selesai-foreground",
  NONAKTIF: "bg-muted text-muted-foreground",
};

export function StatusAkunBadge({ status, className }: { status: StatusAkun; className?: string }) {
  return (
    <Badge variant="outline" className={cn("gap-1.5 rounded-full border-transparent font-medium", AKUN[status], className)}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {LABEL_STATUS_AKUN[status]}
    </Badge>
  );
}
