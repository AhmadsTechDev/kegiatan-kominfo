// =============================================================================
// KERANGKA TATA LETAK OTENTIKASI (AuthShell)
// =============================================================================
// Gunanya: Wadah tata letak terpusat untuk halaman publik dan otentikasi: kartu konten di
// tengah dan nama instansi di bawah.
//
// Isi berkas:
//   - AuthShell : komponen pembungkus tata letak halaman otentikasi
//
// Catatan penting:
//   - Lambang kota dan nama aplikasi ada di dalam KartuPublik; kerangka ini tidak mengulangnya.
//
// Dipakai oleh: Halaman login, minta akun, aktivasi, lupa/atur ulang sandi, verifikasi email
// =============================================================================

import { site } from "@/config/site";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-4 py-10">
      {children}
      <footer className="text-center text-xs text-muted-foreground">
        {site.instansi} {site.wilayah}
      </footer>
    </main>
  );
}
