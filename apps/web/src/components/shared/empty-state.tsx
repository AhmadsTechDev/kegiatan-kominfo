// =============================================================================
// KOMPONEN TAMPILAN DATA KOSONG
// =============================================================================
// Gunanya: Menampilkan informasi visual yang ramah saat data belum tersedia
//          atau hasil penyaringan tidak menemukan rekaman apa pun.
//
// Isi berkas:
//   - EmptyState : komponen penampil ikon, judul, deskripsi, dan tombol aksi
//
// Dipakai oleh: data-table.tsx, tabel kegiatan, master data, dan log audit
// =============================================================================

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 px-4 py-8 text-center", className)}>
      <span aria-hidden className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-5" />
      </span>
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="max-w-sm text-xs text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
