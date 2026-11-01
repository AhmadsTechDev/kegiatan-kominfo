// =============================================================================
// FORMULIR AKTIVASI AKUN (AktivasiForm)
// =============================================================================
// Gunanya: Menangani aktivasi akun bagi pegawai baru melalui tautan ber-token dengan
// memvalidasi token aktivasi, menerima kata sandi baru, dan mengaktifkan akun.
//
// Isi berkas:
//   - Keadaan      : komponen pembantu tampilan status (tautan tidak berlaku atau aktivasi sukses)
//   - AktivasiForm : komponen formulir utama untuk validasi token dan pembuatan sandi baru
//
// Cara kerja:
//   1. Membaca token aktivasi dari parameter URL peramban menggunakan useSearchParams.
//   2. Memverifikasi keabsahan token dan mengambil nama serta email pemilik akun via getInfoAktivasi.
//   3. Mengirimkan kata sandi baru ke server melalui mutasi aktifkanAkun saat formulir disubmit.
//   4. Menampilkan status sukses dengan tombol navigasi masuk ke halaman login.
//
// Catatan penting:
//   - Mematuhi NFR-01: kata sandi minimal 10 karakter dan maksimal 128 karakter.
//   - Tautan undangan aktivasi hanya berlaku 72 jam dan bersifat sekali pakai.
//
// Dipakai oleh: Halaman aktivasi akun (frontend/src/app/(auth)/aktivasi/page.tsx)
// =============================================================================

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CircleAlert, CircleCheck, Eye, EyeOff, LinkIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Wajib } from "@/components/shared/form-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { formatTanggalJam } from "@/lib/format";
import { aktifkanAkun, getInfoAktivasi } from "../api/akun-publik";

const schema = z
  .object({ password: z.string().min(10, "Kata sandi minimal 10 karakter").max(128, "Kata sandi maksimal 128 karakter"), ulang: z.string() })
  .refine((v) => v.password === v.ulang, { path: ["ulang"], message: "Kata sandi tidak sama" });
type Nilai = z.infer<typeof schema>;

function Keadaan({ ikon: Ikon, nada, judul, children }: { ikon: typeof CircleCheck; nada: string; judul: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 py-2 text-center">
      <span aria-hidden className={`flex size-14 items-center justify-center rounded-full ${nada}`}>
        <Ikon className="size-7" />
      </span>
      <div className="flex flex-col gap-1.5">
        <h2 className="font-heading text-xl font-extrabold">{judul}</h2>
        {children}
      </div>
    </div>
  );
}

export function AktivasiForm() {
  const token = useSearchParams().get("token") ?? "";
  const [tampil, setTampil] = useState(false);
  const info = useQuery({ queryKey: ["aktivasi", token], queryFn: () => getInfoAktivasi(token), enabled: token.length > 0, retry: false });
  const aktifkan = useMutation({ mutationFn: (password: string) => aktifkanAkun(token, password) });
  const { register, handleSubmit, setError, formState } = useForm<Nilai>({ resolver: zodResolver(schema), defaultValues: { password: "", ulang: "" } });

  if (!token || info.isError || aktifkan.error?.message === "TOKEN") {
    return (
      <Keadaan ikon={LinkIcon} nada="bg-status-dibatalkan text-status-dibatalkan-foreground" judul="Tautan tidak berlaku">
        <p className="text-sm text-muted-foreground">Tautan aktivasi sudah kedaluwarsa, sudah pernah dipakai, atau tidak lengkap. Minta administrator mengirim ulang undangan.</p>
        <Button asChild variant="outline" className="mx-auto mt-3 h-10">
          <Link href="/login">Ke halaman masuk</Link>
        </Button>
      </Keadaan>
    );
  }

  if (aktifkan.isSuccess) {
    return (
      <Keadaan ikon={CircleCheck} nada="bg-status-selesai text-status-selesai-foreground" judul="Akun aktif">
        <p className="text-sm text-muted-foreground">Kata sandi tersimpan. Silakan masuk dengan email {info.data?.email} atau NIP Anda.</p>
        <Button asChild className="mx-auto mt-3 h-10">
          <Link href="/login">Masuk sekarang</Link>
        </Button>
      </Keadaan>
    );
  }

  if (info.isPending) return <Skeleton className="h-72 w-full rounded-xl" />;

  const kirim = handleSubmit((v) =>
    aktifkan.mutate(v.password, {
      onError: (e) => e.message === "PENDEK" && setError("password", { message: "Kata sandi minimal 10 karakter" }, { shouldFocus: true }),
    }),
  );

  return (
    <form onSubmit={kirim} noValidate className="flex flex-col gap-5">
      <div className="rounded-xl bg-muted/70 p-3 text-sm">
        <p>
          Halo, <span className="font-semibold">{info.data.nama}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          Akun untuk {info.data.email} · tautan berlaku sampai {formatTanggalJam(info.data.kedaluwarsa)}
        </p>
      </div>
      {aktifkan.error?.message === "UMUM" && (
        <Alert variant="destructive" aria-live="polite">
          <CircleAlert />
          <AlertDescription>Aktivasi gagal. Coba lagi beberapa saat.</AlertDescription>
        </Alert>
      )}
      <FieldGroup className="gap-4">
        <Field data-invalid={!!formState.errors.password}>
          <FieldLabel htmlFor="aktivasi-sandi">
            Kata sandi <Wajib />
          </FieldLabel>
          <div className="relative">
            <Input
              id="aktivasi-sandi"
              type={tampil ? "text" : "password"}
              autoComplete="new-password"
              className="h-11 pr-11"
              autoFocus
              aria-invalid={!!formState.errors.password}
              {...register("password")}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-1/2 right-1 -translate-y-1/2"
              aria-label={tampil ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
              aria-pressed={tampil}
              onClick={() => setTampil((v) => !v)}
            >
              {tampil ? <EyeOff /> : <Eye />}
            </Button>
          </div>
          <FieldDescription>Minimal 10 karakter. Gunakan kata sandi yang tidak dipakai di layanan lain.</FieldDescription>
          <FieldError errors={[formState.errors.password]} />
        </Field>
        <Field data-invalid={!!formState.errors.ulang}>
          <FieldLabel htmlFor="aktivasi-ulang">
            Ulangi kata sandi <Wajib />
          </FieldLabel>
          <Input id="aktivasi-ulang" type={tampil ? "text" : "password"} autoComplete="new-password" className="h-11" aria-invalid={!!formState.errors.ulang} {...register("ulang")} />
          <FieldError errors={[formState.errors.ulang]} />
        </Field>
      </FieldGroup>
      <Button type="submit" className="h-11 w-full" disabled={aktifkan.isPending}>
        {aktifkan.isPending && <Spinner />}
        {aktifkan.isPending ? "Mengaktifkan..." : "Aktifkan akun"}
      </Button>
    </form>
  );
}
