// =============================================================================
// PENGALIHAN RUTE AKAR KE DASHBOARD
// =============================================================================
// Gunanya: Titik masuk rute akar ("/") yang langsung mengalihkan navigasi pengguna
// ke halaman dashboard utama ("/dashboard").
//
// Cara kerja:
//   1. Fungsi redirect() Next.js melempar sinyal pengalihan HTTP di sisi server.
//   2. Peramban berpindah ke "/dashboard" tanpa merender antarmuka perantara.
//
// Dipakai oleh: Pengguna yang mengakses alamat domain utama aplikasi.
// =============================================================================

import { redirect } from "next/navigation";

export default function Home() {
  redirect("/dashboard");
}
