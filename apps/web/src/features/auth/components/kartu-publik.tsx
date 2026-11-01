// =============================================================================
// KARTU HALAMAN PUBLIK (KartuPublik)
// =============================================================================
// Gunanya: Wadah kartu terpusat untuk halaman publik yang menyajikan logo pemerintah kota,
// label pembuka (eyebrow), judul utama, deskripsi opsional, dan elemen formulir anak.
//
// Isi berkas:
//   - KartuPublik : komponen wadah kartu dengan lambang kota untuk antarmuka publik
//
// Dipakai oleh: Halaman minta akun dan halaman aktivasi akun
// =============================================================================

import Image from "next/image";
import { site } from "@/config/site";

export function KartuPublik({ eyebrow, judul, deskripsi, children }: { eyebrow: string; judul: string; deskripsi?: string; children: React.ReactNode }) {
  return (
    <div className="flex w-full max-w-md flex-col gap-6 rounded-xl border bg-card p-6 shadow-sm md:p-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <Image src={site.logo} alt={`Logo Pemerintah ${site.wilayah}`} width={52} height={58} priority className="h-14 w-auto" />
        <p className="text-xs font-bold tracking-widest text-primary uppercase">{eyebrow}</p>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight">{judul}</h1>
        {deskripsi && <p className="max-w-xs text-sm text-muted-foreground">{deskripsi}</p>}
      </div>
      {children}
    </div>
  );
}
