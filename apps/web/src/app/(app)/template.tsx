// =============================================================================
// TEMPLAT ANIMASI TRANSISI HALAMAN
// =============================================================================
// Gunanya: Memberikan animasi transisi visual yang mulus saat pengguna berpindah
// antarhalaman di dalam grup rute (app) pada Aplikasi Pendataan Kegiatan.
//
// Isi berkas:
//   - Template : pembungkus halaman dengan efek transisi Tailwind CSS masuk
//
// Cara kerja:
//   1. Dibuat ulang setiap kali perpindahan rute terjadi di Next.js App Router.
//   2. Menerapkan animasi memudar dan meluncur ke atas (fade-in slide-in) pada konten.
//
// Catatan penting:
//   - Animasi keluar sengaja dihindari agar navigasi tetap instan dan responsif.
//
// Dipakai oleh: Next.js App Router membungkus seluruh halaman di dalam rute (app)
// =============================================================================

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex animate-in flex-col gap-6 duration-200 ease-out-expo fade-in slide-in-from-bottom-2">{children}</div>
  );
}
