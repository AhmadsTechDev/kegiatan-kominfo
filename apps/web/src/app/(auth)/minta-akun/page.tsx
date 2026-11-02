// =============================================================================
// HALAMAN PERMINTAAN AKUN (MINTA AKUN)
// =============================================================================
// Gunanya: Menyediakan formulir pengajuan akun baru bagi calon pengguna kepada
// administrator di Aplikasi Pendataan Kegiatan.
//
// Isi berkas:
//   - metadata      : judul tab peramban untuk halaman minta akun
//   - MintaAkunPage : komponen utama penyusun wadah AuthShell dan MintaAkunForm
//
// Dipakai oleh: Next.js App Router untuk rute publik /minta-akun
// =============================================================================

import type { Metadata } from "next";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { KartuPublik } from "@/features/auth/components/kartu-publik";
import { MintaAkunForm } from "@/features/auth/components/minta-akun-form";

export const metadata: Metadata = { title: "Hubungi Administrator" };

export default function MintaAkunPage() {
  return (
    <AuthShell>
      <KartuPublik
        eyebrow="Akses aplikasi"
        judul="Hubungi Administrator"
        deskripsi="Akun hanya dibuat administrator. Kirim data Anda; setelah identitas diverifikasi, tautan aktivasi dikirim ke email pribadi Anda."
      >
        <MintaAkunForm />
      </KartuPublik>
    </AuthShell>
  );
}

