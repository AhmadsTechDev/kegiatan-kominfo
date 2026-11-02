// =============================================================================
// KARTU LOGIN APLIKASI (LoginCard)
// =============================================================================
// Gunanya: Wadah kartu pada halaman masuk yang menyajikan logo instansi, teks sambutan,
// formulir LoginForm, tautan lupa kata sandi, dan petunjuk menghubungi administrator.
//
// Isi berkas:
//   - LoginCard : kartu halaman masuk tanpa tombol daftar; akun hanya dibuat administrator
//
// Catatan penting:
//   - Tidak ada pendaftaran mandiri. "Hubungi Administrator" membuka formulir pesan ke admin
//     (/minta-akun); akun tetap dibuat admin setelah identitas pegawai diverifikasi.
//
// Dipakai oleh: Halaman login (frontend/src/app/(auth)/login/page.tsx)
// =============================================================================

import Image from "next/image";
import Link from "next/link";
import { site } from "@/config/site";
import { LoginForm } from "./login-form";

export function LoginCard() {
  return (
    <div className="flex w-full max-w-md flex-col gap-6 rounded-xl border bg-card p-6 shadow-sm md:p-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <Image src={site.logo} alt={`Logo Pemerintah ${site.wilayah}`} width={58} height={64} priority className="h-16 w-auto" />
        <p className="text-xs font-bold tracking-widest text-primary uppercase">Portal internal dinas</p>
        <h1 className="font-heading text-3xl font-extrabold tracking-tight">Selamat datang</h1>
        <p className="max-w-xs text-sm text-muted-foreground">Masuk dengan email pribadi yang didaftarkan administrator untuk Anda.</p>
      </div>
      <LoginForm />
      <Link href="/lupa-sandi" className="-mt-2 inline-flex items-center self-center rounded text-sm font-semibold text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none pointer-coarse:min-h-11 pointer-coarse:px-2">
        Lupa kata sandi?
      </Link>
      <p className="border-t pt-5 text-center text-sm text-muted-foreground">
        Belum memiliki akun?{" "}
        <Link href="/minta-akun" className="rounded font-semibold text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          Hubungi Administrator
        </Link>{" "}
        untuk mendapatkan akses.
      </p>
    </div>
  );
}
