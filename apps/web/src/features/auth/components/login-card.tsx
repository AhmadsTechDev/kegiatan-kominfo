// =============================================================================
// KARTU LOGIN APLIKASI (LoginCard)
// =============================================================================
// Gunanya: Wadah kartu pada halaman masuk yang menyajikan judul, formulir LoginForm, dan
// tautan minta akun bagi yang belum punya akses.
//
// Isi berkas:
//   - LoginCard : kartu halaman masuk tanpa tombol daftar; akun hanya dibuat administrator
//
// Catatan penting:
//   - Tidak ada pendaftaran mandiri. "Minta akun" membuka formulir permintaan ke admin
//     (/minta-akun); akun tetap dibuat admin setelah identitas pegawai diverifikasi.
//   - "Lupa kata sandi?" ada di LoginForm, sejajar dengan kolom kata sandi.
//
// Dipakai oleh: Halaman login (frontend/src/app/(auth)/login/page.tsx)
// =============================================================================

import Link from "next/link";
import { KartuPublik, KepalaKartu } from "./kartu-publik";
import { LoginForm } from "./login-form";

export function LoginCard() {
  return (
    <KartuPublik>
      <KepalaKartu judul="Masuk" deskripsi="Gunakan email pribadi yang didaftarkan administrator untuk Anda." />
      <LoginForm />
      <p className="border-t pt-5 text-center text-sm text-muted-foreground">
        Belum punya akun?{" "}
        <Link href="/minta-akun" className="inline-flex items-center rounded font-semibold text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none pointer-coarse:min-h-11">
          Minta akun
        </Link>
      </p>
    </KartuPublik>
  );
}
