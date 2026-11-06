"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert, CircleCheck, Eye, EyeOff, LinkIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ApiError } from "@/lib/api-client";
import { skemaSandiBaru, type NilaiSandiBaru } from "@/lib/sandi";
import { useFokusAwal } from "../hooks/use-fokus-awal";

/**
 * Formulir kata sandi baru (aktivasi dan reset) beserta tampilan berhasil / tautan kedaluwarsa
 */

export function Keadaan({ ikon: Ikon, nada, judul, children }: { ikon: typeof CircleCheck; nada: string; judul: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 py-2 text-center">
      <span aria-hidden className={`flex size-14 items-center justify-center rounded-full ${nada}`}>
        <Ikon className="size-7" />
      </span>
      <div className="flex flex-col gap-1.5">
        <h1 className="font-heading text-2xl font-extrabold tracking-tight">{judul}</h1>
        {children}
      </div>
    </div>
  );
}

export const NADA_SUKSES = "bg-status-selesai text-status-selesai-foreground";

export function TautanTidakBerlaku({ pesan, aksi }: { pesan: string; aksi?: { label: string; href: string } }) {
  return (
    <Keadaan ikon={LinkIcon} nada="bg-status-dibatalkan text-status-dibatalkan-foreground" judul="Tautan tidak berlaku">
      <p className="text-sm text-muted-foreground">{pesan}</p>
      <Button asChild variant="outline" className="mx-auto mt-3 h-10 pointer-coarse:min-h-11">
        <Link href={aksi?.href ?? "/login"}>{aksi?.label ?? "Ke halaman masuk"}</Link>
      </Button>
    </Keadaan>
  );
}

export function FormSandiBaru({
  email,
  submitLabel,
  pendingLabel,
  pending,
  galat,
  onSubmit,
}: {
  email: string;
  submitLabel: string;
  pendingLabel: string;
  pending: boolean;
  galat: unknown;
  onSubmit: (password: string, gagal: (e: unknown) => void) => void;
}) {
  const [tampil, setTampil] = useState(false);
  const { register, handleSubmit, setError, setFocus, formState } = useForm<NilaiSandiBaru>({
    resolver: zodResolver(skemaSandiBaru(email)),
    defaultValues: { password: "", ulang: "" },
  });

  useFokusAwal(setFocus, "password");

  const kirim = handleSubmit((v) =>
    onSubmit(v.password, (e) => {
      const d = e instanceof ApiError && e.status === 422 ? e.details?.find((x) => x.field === "password") : undefined;
      if (d) setError("password", { message: d.message }, { shouldFocus: true });
    }),
  );
  const galatUmum = galat && !(galat instanceof ApiError && galat.status === 422) ? (galat instanceof Error ? galat.message : "Terjadi kesalahan.") : null;

  return (
    <form onSubmit={kirim} noValidate className="flex flex-col gap-5">
      {/* Agar pengelola kata sandi menyimpan sandi baru untuk email yang benar */}
      <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
      {galatUmum && (
        <Alert variant="destructive" aria-live="polite">
          <CircleAlert />
          <AlertDescription>{galatUmum}</AlertDescription>
        </Alert>
      )}
      <FieldGroup className="gap-4">
        <Field data-invalid={!!formState.errors.password}>
          <FieldLabel htmlFor="sandi-baru">
            Kata sandi baru
          </FieldLabel>
          <div className="relative">
            <Input
              id="sandi-baru"
              type={tampil ? "text" : "password"}
              autoComplete="new-password"
              className="h-11 pr-12"
              aria-required
              aria-invalid={!!formState.errors.password}
              {...register("password")}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-1/2 right-1 -translate-y-1/2 pointer-coarse:right-0 pointer-coarse:size-11"
              aria-label={tampil ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
              aria-pressed={tampil}
              onClick={() => setTampil((v) => !v)}
            >
              {tampil ? <EyeOff /> : <Eye />}
            </Button>
          </div>
          <FieldError errors={[formState.errors.password]} />
        </Field>
        <Field data-invalid={!!formState.errors.ulang}>
          <FieldLabel htmlFor="sandi-ulang">
            Ulangi kata sandi
          </FieldLabel>
          <Input id="sandi-ulang" type={tampil ? "text" : "password"} autoComplete="new-password" className="h-11" aria-required aria-invalid={!!formState.errors.ulang} {...register("ulang")} />
          <FieldError errors={[formState.errors.ulang]} />
        </Field>
      </FieldGroup>
      <Button type="submit" className="h-11 w-full" disabled={pending}>
        {pending && <Spinner />}
        {pending ? pendingLabel : submitLabel}
      </Button>
    </form>
  );
}
