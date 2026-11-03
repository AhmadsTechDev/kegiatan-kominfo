// =============================================================================
// FORMULIR AKTIVASI AKUN (AktivasiForm)
// =============================================================================
// Gunanya: Menangani aktivasi akun yang dibuat administrator melalui tautan ber-token:
// memvalidasi token, menerima kata sandi pertama, lalu mengaktifkan akun.
//
// Isi berkas:
//   - AktivasiForm : komponen formulir utama untuk validasi token dan pembuatan sandi pertama
//
// Cara kerja:
//   1. Membaca token aktivasi dari parameter URL peramban menggunakan useSearchParams.
//   2. Memverifikasi token dan mengambil nama serta email pemilik akun via getInfoAktivasi.
//   3. Mengirim kata sandi ke POST /api/aktivasi; email terverifikasi dan akun menjadi aktif.
//   4. Menampilkan status sukses dengan tombol navigasi masuk ke halaman login.
//
// Catatan penting:
//   - Tautan undangan berlaku 72 jam dan sekali pakai; kirim ulang undangan membatalkan tautan lama.
//
// Dipakai oleh: Halaman aktivasi akun (frontend/src/app/(auth)/aktivasi/page.tsx)
// =============================================================================

"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { CircleCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { aktifkanAkun, getInfoAktivasi, tautanRusak, tokenTidakBerlaku } from "../api/akun-publik";
import { KepalaKartu } from "./kartu-publik";
import { FormSandiBaru, Keadaan, NADA_SUKSES, TautanTidakBerlaku } from "./form-sandi-baru";

const PESAN_TIDAK_BERLAKU = "Tautan aktivasi sudah kedaluwarsa, sudah pernah dipakai, atau tidak lengkap. Minta administrator mengirim ulang undangan.";

export function AktivasiForm() {
  const token = useSearchParams().get("token") ?? "";
  const info = useQuery({ queryKey: ["aktivasi", token], queryFn: () => getInfoAktivasi(token), enabled: token.length > 0, retry: false });
  const aktifkan = useMutation({
    mutationFn: async (password: string) => {
      const hasil = await aktifkanAkun(token, password);
      // Bila browser ini masih login sebagai akun lain (mis. admin yang mengundang), keluarkan dulu.
      // Tanpa ini "Masuk sekarang" langsung dialihkan ke dashboard akun lama
      await authClient.signOut().catch(() => undefined);
      return hasil;
    },
  });

  if (!token || tautanRusak(info.error) || tokenTidakBerlaku(aktifkan.error)) return <TautanTidakBerlaku pesan={PESAN_TIDAK_BERLAKU} />;

  if (aktifkan.isSuccess) {
    return (
      <Keadaan ikon={CircleCheck} nada={NADA_SUKSES} judul="Akun aktif">
        <p className="text-sm text-muted-foreground">Email terverifikasi dan kata sandi tersimpan. Silakan masuk dengan email {aktifkan.data.email}.</p>
        <Button asChild className="mx-auto mt-3 h-10 pointer-coarse:min-h-11">
          <Link href="/login">Masuk sekarang</Link>
        </Button>
      </Keadaan>
    );
  }

  if (info.isError) return <ErrorState message={info.error.message} onRetry={() => info.refetch()} retrying={info.isRefetching} />;
  if (info.isPending) return <Skeleton className="h-72 w-full rounded-xl" />;

  return (
    <div className="flex flex-col gap-5">
      <KepalaKartu judul="Buat kata sandi" deskripsi="Langkah terakhir sebelum Anda dapat masuk ke aplikasi." />
      <p className="rounded-xl bg-muted/70 p-3 text-sm">
        Halo, <span className="font-semibold">{info.data.nama}</span>
      </p>
      <FormSandiBaru
        email={info.data.email}
        submitLabel="Aktifkan akun"
        pendingLabel="Mengaktifkan..."
        pending={aktifkan.isPending}
        galat={aktifkan.error}
        onSubmit={(password, gagal) => aktifkan.mutate(password, { onError: gagal })}
      />
    </div>
  );
}
