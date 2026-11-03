// =============================================================================
// FORMULIR LUPA DAN ATUR ULANG KATA SANDI
// =============================================================================
// Gunanya: Dua langkah pemulihan kata sandi tanpa login: meminta tautan lewat email,
// lalu membuat kata sandi baru dari tautan tersebut.
//
// Isi berkas:
//   - LupaSandiForm  : formulir email; jawaban selalu sama agar tidak membocorkan email terdaftar
//   - ResetSandiForm : cek token, formulir kata sandi baru, dan keadaan sukses
//
// Cara kerja:
//   1. LupaSandiForm mengirim POST /api/lupa-sandi lalu menampilkan pesan umum dari server.
//   2. ResetSandiForm membaca ?token=, mengecek GET /api/reset-sandi, lalu POST /api/reset-sandi.
//   3. Setelah berhasil, semua sesi lama dicabut sehingga pengguna perlu masuk ulang.
//
// Catatan penting:
//   - Tautan atur ulang berlaku 1 jam dan sekali pakai.
//
// Dipakai oleh: Halaman /lupa-sandi dan /reset-sandi
// =============================================================================

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CircleAlert, CircleCheck, MailCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ErrorState } from "@/components/shared/error-state";
import { Wajib } from "@/components/shared/form-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";
import { getInfoReset, mintaResetSandi, resetSandi, tautanRusak, tokenTidakBerlaku } from "../api/akun-publik";
import { useFokusAwal } from "../hooks/use-fokus-awal";
import { KepalaKartu } from "./kartu-publik";
import { FormSandiBaru, Keadaan, NADA_SUKSES, TautanTidakBerlaku } from "./form-sandi-baru";

const schemaEmail = z.object({ email: z.string().trim().min(1, "Email wajib diisi").pipe(z.email("Format email tidak valid")) });

export function LupaSandiForm() {
  const minta = useMutation({ mutationFn: mintaResetSandi });
  const { register, handleSubmit, setFocus, formState } = useForm<{ email: string }>({ resolver: zodResolver(schemaEmail), defaultValues: { email: "" } });

  useFokusAwal(setFocus, "email");

  if (minta.isSuccess) {
    return (
      <Keadaan ikon={MailCheck} nada={NADA_SUKSES} judul="Periksa email Anda">
        <p className="text-sm text-muted-foreground">{minta.data.message}</p>
        <p className="text-sm text-muted-foreground">Tidak menerima email dalam beberapa menit? Hubungi administrator aplikasi.</p>
        <Button asChild variant="outline" className="mx-auto mt-3 h-10 pointer-coarse:min-h-11">
          <Link href="/login">Kembali ke halaman masuk</Link>
        </Button>
      </Keadaan>
    );
  }

  return (
    <>
      <KepalaKartu judul="Lupa kata sandi" deskripsi="Masukkan email akun Anda. Bila terdaftar, kami kirim tautan untuk membuat kata sandi baru." />
      <form onSubmit={handleSubmit((v) => minta.mutate(v.email))} noValidate className="flex flex-col gap-5">
        {minta.isError && (
          <Alert variant="destructive" aria-live="polite">
            <CircleAlert />
            <AlertDescription>{minta.error.message}</AlertDescription>
          </Alert>
        )}
        <Field data-invalid={!!formState.errors.email}>
          <FieldLabel htmlFor="lupa-email">
            Email akun <Wajib />
          </FieldLabel>
          <Input id="lupa-email" type="email" placeholder="Masukkan email" aria-required inputMode="email" autoComplete="email" className="h-11" aria-invalid={!!formState.errors.email} {...register("email")} />
          <FieldError errors={[formState.errors.email]} />
        </Field>
        <Button type="submit" className="h-11 w-full" disabled={minta.isPending}>
          {minta.isPending && <Spinner />}
          {minta.isPending ? "Mengirim..." : "Kirim tautan atur ulang"}
        </Button>
        <Link href="/login" className="inline-flex items-center self-center rounded text-sm font-semibold text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none pointer-coarse:min-h-11">
          Kembali ke halaman masuk
        </Link>
      </form>
    </>
  );
}

const PESAN_TIDAK_BERLAKU = "Tautan atur ulang kata sandi sudah kedaluwarsa, sudah pernah dipakai, atau tidak lengkap. Minta tautan baru.";

export function ResetSandiForm() {
  const token = useSearchParams().get("token") ?? "";
  const info = useQuery({ queryKey: ["reset-sandi", token], queryFn: () => getInfoReset(token), enabled: token.length > 0, retry: false });
  const simpan = useMutation({
    mutationFn: async (password: string) => {
      const hasil = await resetSandi(token, password);
      // Sesi akun lain di browser ini dikeluarkan agar "Masuk" tidak dialihkan ke dashboard akun tersebut
      await authClient.signOut().catch(() => undefined);
      return hasil;
    },
  });
  const mintaBaru = { label: "Minta tautan baru", href: "/lupa-sandi" };

  if (!token || tautanRusak(info.error) || tokenTidakBerlaku(simpan.error)) return <TautanTidakBerlaku pesan={PESAN_TIDAK_BERLAKU} aksi={mintaBaru} />;

  if (simpan.isSuccess) {
    return (
      <Keadaan ikon={CircleCheck} nada={NADA_SUKSES} judul="Kata sandi diperbarui">
        <p className="text-sm text-muted-foreground">Semua sesi lama telah dikeluarkan. Silakan masuk dengan kata sandi baru.</p>
        <Button asChild className="mx-auto mt-3 h-10 pointer-coarse:min-h-11">
          <Link href="/login">Masuk sekarang</Link>
        </Button>
      </Keadaan>
    );
  }

  if (info.isError) return <ErrorState message={info.error.message} onRetry={() => info.refetch()} retrying={info.isRefetching} />;
  if (info.isPending) return <Skeleton className="h-64 w-full rounded-xl" />;

  return (
    <div className="flex flex-col gap-5">
      <KepalaKartu judul="Buat kata sandi baru" />
      <p className="rounded-xl bg-muted/70 p-3 text-sm">
        Kata sandi baru untuk <span className="font-semibold">{info.data.email}</span>
      </p>
      <FormSandiBaru
        email={info.data.email}
        submitLabel="Simpan kata sandi baru"
        pendingLabel="Menyimpan..."
        pending={simpan.isPending}
        galat={simpan.error}
        onSubmit={(password, gagal) => simpan.mutate(password, { onError: gagal })}
      />
    </div>
  );
}
