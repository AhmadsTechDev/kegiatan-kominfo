// =============================================================================
// LABEL PENANDA UNIT KERJA (UNIT CHIP)
// =============================================================================
// Gunanya: Menampilkan label penanda nama unit kerja atau bidang penanggung jawab
// kegiatan pada tabel dan kartu antarmuka Aplikasi Pendataan Kegiatan.
//
// Isi berkas:
//   - UnitChip : komponen chip netral dengan pemotongan teks maksimal dua baris
//
// Catatan penting:
//   - Warna abu-abu netral digunakan agar tidak bersaing visual dengan lencana status.
// =============================================================================

import { cn } from "@/lib/utils";

export function UnitChip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex max-w-full items-center rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground", className)}>
      <span className="line-clamp-2">{children}</span>
    </span>
  );
}
