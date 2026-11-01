// =============================================================================
// UTILITAS PENGGABUNG KELAS CSS (CN)
// =============================================================================
// Gunanya: Mengekspor ulang fungsi utilitas cn untuk penggabungan nama kelas CSS
// Tailwind secara kondisional dan penyelesaian konflik class styling antarmuka.
//
// Isi berkas:
//   - cn : helper penggabung kelas CSS Tailwind berbasis clsx dan tailwind-merge.
//
// Catatan penting:
//   - Menjadi pintu masuk tunggal utilitas styling bagi seluruh komponen UI aplikasi.
//
// Dipakai oleh: Seluruh komponen di components/ui dan components/shared.
// =============================================================================

export { cn } from "cn"
