import Image from "next/image";
import { site } from "@/config/site";

/**
 * Kartu halaman publik: lambang kota dan nama aplikasi, judul isi lewat KepalaKartu
 */

export function KartuPublik({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full max-w-md flex-col gap-6 rounded-xl border border-t-4 border-t-chart-3 bg-card p-6 shadow-sm md:p-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <Image src={site.logo} alt={`Logo Pemerintah ${site.wilayah}`} width={52} height={58} priority className="h-14 w-auto" />
        <p className="text-sm font-semibold text-muted-foreground">{site.namaSistem}</p>
      </div>
      {children}
    </div>
  );
}

export function KepalaKartu({ judul, deskripsi }: { judul: string; deskripsi?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <h1 className="font-heading text-2xl font-extrabold tracking-tight">{judul}</h1>
      {deskripsi && <p className="max-w-xs text-sm text-muted-foreground">{deskripsi}</p>}
    </div>
  );
}
