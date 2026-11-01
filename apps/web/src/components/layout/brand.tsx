// =============================================================================
// IDENTITAS BRAND DAN LOGO INSTANSI
// =============================================================================
// Gunanya: Menampilkan logo instansi dan nama dinas sebagai tautan beranda pada
// kepala bilah samping Aplikasi Pendataan Kegiatan.
//
// Isi berkas:
//   - Brand : komponen logo berlatar lingkaran putih dengan teks responsif
//
// Catatan penting:
//   - Teks nama dinas disembunyikan saat bilah samping menyusut ke mode rel ikon.
// =============================================================================

import Image from "next/image";
import Link from "next/link";
import { site } from "@/config/site";
import { cn } from "@/lib/utils";

export function Brand({ hideTextClassName }: { hideTextClassName?: string }) {
  return (
    <Link
      href="/dashboard"
      className="flex items-center gap-3 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-sidebar-primary/60"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-sidebar-border">
        <Image src={site.logo} alt="Logo Diskominfo Kota Palembang" width={28} height={31} className="h-7 w-auto object-contain" />
      </span>
      <span className={cn("min-w-0 flex-col leading-tight", hideTextClassName ?? "flex")}>
        <span className="font-heading text-base font-extrabold tracking-tight text-sidebar-strong">Diskominfo</span>
        <span className="truncate text-xs font-medium text-sidebar-foreground">{site.wilayah}</span>
      </span>
    </Link>
  );
}
