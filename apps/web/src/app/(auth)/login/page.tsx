// =============================================================================
// HALAMAN MASUK (LOGIN)
// =============================================================================
// Gunanya: Menyajikan formulir autentikasi pengguna dan admin untuk masuk ke dalam
// Aplikasi Pendataan Kegiatan menggunakan username/email dan kata sandi.
//
// Isi berkas:
//   - metadata  : judul tab peramban untuk halaman masuk
//   - LoginPage : komponen utama yang menyajikan LoginCard di dalam kerangka AuthShell
//
// Dipakai oleh: Next.js App Router untuk rute /login
// =============================================================================

import type { Metadata } from "next";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { LoginCard } from "@/features/auth/components/login-card";

export const metadata: Metadata = { title: "Masuk" };

export default function LoginPage() {
  return (
    <AuthShell>
      <LoginCard />
    </AuthShell>
  );
}
