// =============================================================================
// KARTU HALAMAN PUBLIK (KartuPublik)
// =============================================================================
// Gunanya: Wadah kartu terpusat untuk halaman publik: lambang kota dan nama aplikasi satu kali,
// lalu isi yang menulis judulnya sendiri lewat KepalaKartu sesuai keadaan halaman.
//
// Isi berkas:
//   - KartuPublik : kartu dengan lambang kota, nama aplikasi, dan garis emas di tepi atas
//   - KepalaKartu : judul (h1) dan keterangan singkat; dipasang oleh isi kartu, bukan halaman
//
// Catatan penting:
//   - Judul tidak dipasang di kartu karena keadaan akhir (berhasil, tautan rusak) harus punya
//     judul sendiri; kepala tetap yang membuat satu h1 per keadaan.
//
// Dipakai oleh: Halaman login, minta akun, aktivasi, lupa/atur ulang sandi, verifikasi email
// =============================================================================

import Image from "next/image";
import { site } from "@/config/site";

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
