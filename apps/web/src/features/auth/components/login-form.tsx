"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert, Eye, EyeOff, Lock, LockKeyhole, Mail } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { LoginError } from "../api/login";
import { formatSisaWaktu, useCountdown } from "../hooks/use-countdown";
import { useFokusAwal } from "../hooks/use-fokus-awal";
import { useLogin } from "../hooks/use-login";
import { loginSchema, type LoginInput } from "../schemas/login.schema";

/**
 * Formulir login: validasi, kirim, dan tampilan akun terkunci sementara
 */

export function LoginForm() {
  const [tampilkanSandi, setTampilkanSandi] = useState(false);
  const loginMutation = useLogin();
  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  useFokusAwal(setFocus, "email");

  const error = loginMutation.error instanceof LoginError ? loginMutation.error : null;
  const sisaKunci = useCountdown(error?.kind === "terkunci" ? error.lockedUntil : undefined, error?.diterimaPada ?? 0);
  const terkunci = sisaKunci !== null;
  const sibuk = loginMutation.isPending || loginMutation.isSuccess;

  const onSubmit = handleSubmit((data) => loginMutation.mutate(data));

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      {terkunci ? (
        <Alert variant="destructive" aria-live="polite">
          <LockKeyhole />
          <AlertTitle>Akun terkunci sementara</AlertTitle>
          <AlertDescription>
            <p>Terlalu banyak percobaan. Coba lagi dalam 15 menit.</p>
            <p>
              Sisa waktu <span className="font-semibold tabular-nums">{formatSisaWaktu(sisaKunci)}</span>
            </p>
          </AlertDescription>
        </Alert>
      ) : (
        error &&
        error.kind !== "terkunci" && (
          <Alert variant="destructive" aria-live="polite">
            <CircleAlert />
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )
      )}

      <FieldGroup className="gap-4">
        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="email">
            Email
          </FieldLabel>
          <div className="relative">
            <Mail
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="username"
              placeholder="Masukkan email"
              className="h-11 pl-9"
              aria-required
              aria-invalid={!!errors.email}
              {...register("email")}
            />
          </div>
          <FieldError errors={[errors.email]} />
        </Field>

        <Field data-invalid={!!errors.password}>
          <div className="flex items-center justify-between gap-2">
            <FieldLabel htmlFor="password">
              Kata sandi
            </FieldLabel>
            <Link href="/lupa-sandi" className="inline-flex items-center rounded text-sm font-semibold text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none pointer-coarse:min-h-11">
              Lupa kata sandi?
            </Link>
          </div>
          <div className="relative">
            <Lock
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="password"
              placeholder="Masukkan kata sandi"
              type={tampilkanSandi ? "text" : "password"}
              autoComplete="current-password"
              className="h-11 pr-12 pl-9"
              aria-required
              aria-invalid={!!errors.password}
              {...register("password")}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-1/2 right-1 -translate-y-1/2 pointer-coarse:right-0 pointer-coarse:size-11"
              aria-label={tampilkanSandi ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
              aria-pressed={tampilkanSandi}
              onClick={() => setTampilkanSandi((v) => !v)}
            >
              {tampilkanSandi ? <EyeOff /> : <Eye />}
            </Button>
          </div>
          <FieldError errors={[errors.password]} />
        </Field>
      </FieldGroup>

      <Button type="submit" className="h-11 w-full" disabled={sibuk || terkunci}>
        {sibuk && <Spinner />}
        {sibuk ? "Memproses..." : "Masuk ke aplikasi"}
      </Button>
    </form>
  );
}
