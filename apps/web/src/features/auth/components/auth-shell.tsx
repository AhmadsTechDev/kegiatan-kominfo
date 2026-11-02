// =============================================================================
// KERANGKA TATA LETAK OTENTIKASI (AuthShell)
// =============================================================================
// Gunanya: Wadah tata letak terpusat untuk halaman publik dan otentikasi yang menampilkan
// identitas dinas di bagian atas, kartu konten di tengah, dan hak cipta di bawah.
//
// Isi berkas:
//   - AuthShell : komponen pembungkus tata letak halaman otentikasi dengan identitas dinas
//
// Dipakai oleh: Halaman login, hubungi administrator, aktivasi, lupa/atur ulang sandi, verifikasi email
// =============================================================================

import { Building2 } from "lucide-react";
import { site } from "@/config/site";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-4 py-10">
      <div className="flex items-center gap-3">
        <span aria-hidden className="flex size-10 items-center justify-center rounded-lg border border-primary/20 bg-secondary text-primary">
          <Building2 className="size-5" />
        </span>
        <div className="flex flex-col leading-tight">
          <span className="text-xs font-extrabold tracking-wider uppercase">Diskominfo {site.wilayah}</span>
          <span className="text-xs text-muted-foreground">{site.namaSistem}</span>
        </div>
      </div>
      {children}
      <footer className="flex flex-col items-center gap-0.5 text-center text-xs text-muted-foreground">
        <span className="font-semibold">{site.namaSistem}</span>
        <span>
          {site.instansi} {site.wilayah}
        </span>
      </footer>
    </main>
  );
}
