// =============================================================================
// KONFIGURASI IDENTITAS INSTANSI DAN APLIKASI
// =============================================================================
// Gunanya: Menyimpan konstanta identitas instansi, nama resmi aplikasi, wilayah,
// dan lokasi logo dinas yang digunakan seragam di seluruh antarmuka.
//
// Isi berkas:
//   - site : objek konfigurasi identitas readonly (as const) Diskominfo Kota Palembang.
//
// Catatan penting:
//   - Perubahan identitas instansi, nama aplikasi, atau logo terpusat di berkas ini.
//
// Dipakai oleh: brand.tsx, login-card.tsx, not-found.tsx, dan layout aplikasi.
// =============================================================================

export const site = {
  namaSistem: "Aplikasi Pendataan Kegiatan",
  namaSingkat: "Aplikasi Pendataan Kegiatan",
  instansi: "Dinas Komunikasi dan Informatika",
  wilayah: "Kota Palembang",
  logo: "/images/logo.png",
} as const;
