// =============================================================================
// KARTU LOGIN APLIKASI (LoginCard)
// =============================================================================
// Gunanya: Wadah kartu pada halaman masuk yang menyajikan logo instansi, teks sambutan,
// formulir LoginForm, tombol minta akun baru, dan petunjuk lupa kata sandi.
//
// Isi berkas:
//   - LoginCard : kartu halaman masuk; pegawai baru diarahkan meminta akun ke admin (PRD bagian 3)
//
// Dipakai oleh: Halaman login (frontend/src/app/(auth)/login/page.tsx)
// =============================================================================

import { UserPlus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { site } from "@/config/site";
import { LoginForm } from "./login-form";

export function LoginCard() {
  return (
    <div className="flex w-full max-w-md flex-col gap-6 rounded-xl border bg-card p-6 shadow-sm md:p-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <Image src={site.logo} alt={`Logo Pemerintah ${site.wilayah}`} width={58} height={64} priority className="h-16 w-auto" />
        <p className="text-xs font-bold tracking-widest text-primary uppercase">Portal internal dinas</p>
        <h1 className="font-heading text-3xl font-extrabold tracking-tight">Selamat datang</h1>
        <p className="max-w-xs text-sm text-muted-foreground">Masuk menggunakan akun dinas yang telah diberikan administrator.</p>
      </div>
      <LoginForm />
      <Button asChild variant="outline" className="h-10 w-full">
        <Link href="/minta-akun">
          <UserPlus aria-hidden />
          Minta akun
        </Link>
      </Button>
      <p className="text-center text-xs text-muted-foreground">Lupa kata sandi? Hubungi administrator aplikasi untuk mengatur ulang.</p>
    </div>
  );
}
