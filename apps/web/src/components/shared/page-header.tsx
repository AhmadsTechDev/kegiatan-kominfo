// =============================================================================
// HEADER KEPALA HALAMAN
// =============================================================================
// Gunanya: Menyajikan tata letak kepala halaman yang seragam berisi label kategori,
//          judul utama, deskripsi singkat, dan deretan tombol aksi.
//
// Isi berkas:
//   - PageHeader : komponen tata letak kepala halaman aplikasi yang konsisten
//
// Catatan penting:
//   - Eyebrow berupa label kategori huruf kapital di atas judul (reference/dashboard-admin).
//
// Dipakai oleh: Halaman daftar kegiatan, dashboard, rekapitulasi, dan formulir
// =============================================================================

import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  eyebrow?: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
};

export function PageHeader({ title, eyebrow, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4 md:flex-row md:items-start md:justify-between", className)}>
      <div className="flex min-w-0 flex-col gap-1.5">
        {eyebrow && (
          <p className="flex items-center gap-2 text-xs font-bold tracking-widest text-primary uppercase">
            <span aria-hidden className="h-0.5 w-4 rounded-full bg-primary" />
            {eyebrow}
          </p>
        )}
        <h1 className="font-heading text-2xl font-extrabold tracking-tight md:text-3xl">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
