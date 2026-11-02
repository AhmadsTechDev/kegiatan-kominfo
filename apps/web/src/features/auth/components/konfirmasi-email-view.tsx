// =============================================================================
// VERIFIKASI EMAIL BARU (KonfirmasiEmailView)
// =============================================================================
// Gunanya: Menyelesaikan perubahan email akun dari tautan yang dikirim ke email baru.
//
// Isi berkas:
//   - KonfirmasiEmailView : membaca ?token=, meminta konfirmasi pengguna, lalu menampilkan hasilnya
//
// Cara kerja:
//   1. Pengguna menekan tombol konfirmasi (tidak otomatis, agar pemindai tautan di email
//      tidak memakai token sekali pakai ini).
//   2. POST /api/konfirmasi-email mengganti email login; email lama tidak berlaku lagi.
//
// Dipakai oleh: Halaman /konfirmasi-email
// =============================================================================

"use client";

import { useMutation } from "@tanstack/react-query";
import { CircleAlert, CircleCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { konfirmasiEmail, tokenTidakBerlaku } from "../api/akun-publik";
import { useCurrentUser } from "../hooks/use-current-user";
import { KepalaKartu } from "./kartu-publik";
import { Keadaan, NADA_SUKSES, TautanTidakBerlaku } from "./form-sandi-baru";

const PESAN_TIDAK_BERLAKU = "Tautan verifikasi sudah kedaluwarsa, sudah pernah dipakai, atau dibatalkan. Ajukan ulang perubahan email dari halaman Pengaturan.";

export function KonfirmasiEmailView() {
  const token = useSearchParams().get("token") ?? "";
  const konfirmasi = useMutation({ mutationFn: () => konfirmasiEmail(token) });
  const { user } = useCurrentUser();

  if (!token || tokenTidakBerlaku(konfirmasi.error)) return <TautanTidakBerlaku pesan={PESAN_TIDAK_BERLAKU} />;

  if (konfirmasi.isSuccess) {
    return (
      <Keadaan ikon={CircleCheck} nada={NADA_SUKSES} judul="Email terverifikasi">
        <p className="text-sm text-muted-foreground">Mulai sekarang masuk dengan {konfirmasi.data.email}. Email lama tidak dapat dipakai lagi.</p>
        {/* Tautan email sering dibuka di peramban lain; tanpa sesi, Pengaturan hanya memantul ke login */}
        <Button asChild className="mx-auto mt-3 h-10 pointer-coarse:min-h-11">
          {user ? <Link href="/pengaturan?tab=akun">Ke pengaturan akun</Link> : <Link href="/login">Masuk dengan email baru</Link>}
        </Button>
      </Keadaan>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <KepalaKartu judul="Verifikasi email baru" />
      {konfirmasi.isError && (
        <Alert variant="destructive" aria-live="polite">
          <CircleAlert />
          <AlertDescription>{konfirmasi.error.message}</AlertDescription>
        </Alert>
      )}
      <p className="text-center text-sm text-muted-foreground">Tekan tombol di bawah untuk memakai email ini sebagai email login akun Anda.</p>
      <Button className="h-11 w-full" onClick={() => konfirmasi.mutate()} disabled={konfirmasi.isPending}>
        {konfirmasi.isPending && <Spinner />}
        {konfirmasi.isPending ? "Memverifikasi..." : "Verifikasi email"}
      </Button>
    </div>
  );
}
