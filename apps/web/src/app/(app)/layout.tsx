// =============================================================================
// TATA LETAK UTAMA APLIKASI (APP LAYOUT)
// =============================================================================
// Gunanya: Membungkus semua halaman di dalam grup rute (app) pada Aplikasi Pendataan
// Kegiatan dengan kerangka AppShell (bilah samping, bilah atas, dan area konten).
//
// Isi berkas:
//   - AppLayout : komponen tata letak utama yang mempertahankan status navigasi
//
// Catatan penting:
//   - Layout tidak dibuat ulang saat berpindah rute sehingga interaksi tetap mulus.
//
// Dipakai oleh: Next.js App Router untuk seluruh rute internal di dalam grup (app)
// =============================================================================

import { AppShell } from "@/components/layout/app-shell";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return <AppShell>{children}</AppShell>;
}
