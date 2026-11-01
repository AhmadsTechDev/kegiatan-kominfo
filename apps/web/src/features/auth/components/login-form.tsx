// =============================================================================
// KOMPONEN FORMULIR LOGIN (LoginForm)
// =============================================================================
// Gunanya: Menangani interaksi formulir masuk pengguna (NIP/email dan kata sandi), validasi
// input, pemanggilan mutasi autentikasi, serta penanganan akun terkunci sementara.
//
// Isi berkas:
//   - LoginForm : komponen formulir login dengan visualisasi hitung mundur saat terkunci
//
// Cara kerja:
//   1. Mengelola input identitas dan kata sandi dengan validasi skema loginSchema via React Hook Form.
//   2. Mengirim kredensial ke server melalui mutasi useLogin saat formulir dikirim.
//   3. Menampilkan peringatan dan timer hitung mundur jika akun terkunci sementara (LoginError).
//   4. Menonaktifkan tombol submit saat proses/sukses agar terhindar dari pengiriman ganda.
//
// Catatan penting:
//   - Membedakan galat umum dengan akun terkunci memakai useCountdown untuk menampilkan sisa waktu.
//   - Menyediakan fitur beralih tampilan kata sandi (lihat/sembunyikan).
//
// Dipakai oleh: LoginCard (frontend/src/features/auth/components/login-card.tsx)
// =============================================================================

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert, Eye, EyeOff, Lock, LockKeyhole, UserRound } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { LoginError } from "../api/login";
import { formatSisaWaktu, useCountdown } from "../hooks/use-countdown";
import { useLogin } from "../hooks/use-login";
import { loginSchema, type LoginInput } from "../schemas/login.schema";

export function LoginForm() {
  const [tampilkanSandi, setTampilkanSandi] = useState(false);
  const loginMutation = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identitas: "", password: "" },
  });

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
        <Field data-invalid={!!errors.identitas}>
          <FieldLabel htmlFor="identitas">
            NIP atau email
            <span aria-hidden className="text-destructive">
              *
            </span>
          </FieldLabel>
          <div className="relative">
            <UserRound
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="identitas"
              autoComplete="username"
              autoFocus
              placeholder="Masukkan NIP atau email"
              className="h-11 pl-9"
              aria-required
              aria-invalid={!!errors.identitas}
              {...register("identitas")}
            />
          </div>
          <FieldError errors={[errors.identitas]} />
        </Field>

        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="password">
            Kata sandi
            <span aria-hidden className="text-destructive">
              *
            </span>
          </FieldLabel>
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
              className="h-11 pr-11 pl-9"
              aria-required
              aria-invalid={!!errors.password}
              {...register("password")}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-1/2 right-1 -translate-y-1/2"
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
