// =============================================================================
// KOMPONEN FORMULIR PERMINTAAN AKUN (MintaAkunForm)
// =============================================================================
// Gunanya: Menyediakan formulir pengajuan akun baru bagi pegawai atau non-ASN kepada admin,
// mencakup nama, NIP (opsional), email pribadi, catatan, serta visualisasi status hasil.
//
// Isi berkas:
//   - KOLOM         : pemetaan nama kolom galat dari respons backend ke properti formulir
//   - MintaAkunForm : komponen formulir permintaan akun baru dan layar konfirmasi sukses
//
// Cara kerja:
//   1. Mengelola isian formulir dengan validasi Zod (nama, NIP 18 digit opsional, email, catatan).
//   2. Mengirim data permohonan ke API publik menggunakan mutasi TanStack Query ajukanPermintaanAkun.
//   3. Memetakan galat dari server ke masing-masing kolom input atau menampilkan kotak galat umum.
//   4. Menampilkan layar sukses jika pengajuan berhasil diterima server untuk ditinjau admin.
//
// Catatan penting:
//   - NIP bersifat opsional agar pegawai non-ASN tanpa NIP tetap dapat mengajukan permohonan akun.
//   - Akun baru tidak langsung aktif, melainkan harus disetujui oleh administrator terlebih dahulu.
//
// Dipakai oleh: Halaman minta akun (frontend/src/app/(auth)/minta-akun/page.tsx)
// =============================================================================

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, CircleAlert, MailCheck } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api-client";
import { zNip } from "@/lib/nip";
import { ajukanPermintaanAkun } from "../api/akun-publik";
import { useFokusAwal } from "../hooks/use-fokus-awal";
import { KepalaKartu } from "./kartu-publik";

const schema = z.object({
  nama: z.string().trim().min(1, "Nama wajib diisi").max(150, "Nama maksimal 150 karakter"),
  nip: z.union([z.literal(""), zNip()]),
  email: z.email("Email tidak valid").max(255),
  catatan: z.string().max(500, "Catatan maksimal 500 karakter"),
});
type Nilai = z.infer<typeof schema>;

const KOLOM: Record<string, keyof Nilai> = { nama: "nama", nip: "nip", email: "email", catatan: "catatan" };

export function MintaAkunForm() {
  const ajukan = useMutation({ mutationFn: ajukanPermintaanAkun });
  const { register, handleSubmit, setError, setFocus, formState, getValues } = useForm<Nilai>({
    resolver: zodResolver(schema),
    defaultValues: { nama: "", nip: "", email: "", catatan: "" },
  });

  useFokusAwal(setFocus, "nama");

  const galatUmum =
    ajukan.error instanceof ApiError && !(ajukan.error.details ?? []).some((d) => d.field && KOLOM[d.field]) ? ajukan.error.message : null;

  const kirim = handleSubmit((v) =>
    ajukan.mutate(
      { nama: v.nama, nip: v.nip || null, email: v.email.trim().toLowerCase(), catatan: v.catatan.trim() || null },
      {
        onError: (e) => {
          if (e instanceof ApiError) for (const d of e.details ?? []) if (d.field && KOLOM[d.field]) setError(KOLOM[d.field]!, { message: d.message }, { shouldFocus: true });
        },
      },
    ),
  );

  if (ajukan.isSuccess) {
    return (
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <span aria-hidden className="flex size-14 items-center justify-center rounded-full bg-status-selesai text-status-selesai-foreground">
          <MailCheck className="size-7" />
        </span>
        <div className="flex flex-col gap-1.5">
          <h1 className="font-heading text-2xl font-extrabold tracking-tight">Permintaan terkirim</h1>
          <p className="text-sm text-muted-foreground">
            Administrator akan meninjau permintaan Anda. Bila disetujui, tautan aktivasi dikirim ke <span className="font-semibold text-foreground">{getValues("email")}</span>.
          </p>
          <p className="text-sm text-muted-foreground">Periksa juga folder spam. Bila setelah beberapa hari kerja belum ada email, tanyakan ke administrator di bidang Anda.</p>
        </div>
        <Button asChild variant="outline" className="h-10 pointer-coarse:min-h-11">
          <Link href="/login">
            <ArrowLeft aria-hidden />
            Kembali ke halaman masuk
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <KepalaKartu judul="Minta akun" deskripsi="Administrator memeriksa data Anda, lalu mengirim tautan aktivasi ke email pribadi Anda." />
      <form onSubmit={kirim} noValidate className="flex flex-col gap-5">
        {galatUmum && (
          <Alert variant="destructive" aria-live="polite">
            <CircleAlert />
            <AlertDescription>{galatUmum}</AlertDescription>
          </Alert>
        )}
        <FieldGroup className="gap-4">
          <Field data-invalid={!!formState.errors.nama}>
            <FieldLabel htmlFor="minta-nama">
              Nama lengkap
            </FieldLabel>
            <Input id="minta-nama" autoComplete="name" maxLength={150} className="h-11" aria-invalid={!!formState.errors.nama} {...register("nama")} />
            <FieldError errors={[formState.errors.nama]} />
          </Field>
          <Field data-invalid={!!formState.errors.nip}>
            <FieldLabel htmlFor="minta-nip">
              NIP
            </FieldLabel>
            <Input id="minta-nip" inputMode="numeric" maxLength={18} placeholder="Opsional, 18 digit" className="h-11 tabular-nums" aria-invalid={!!formState.errors.nip} {...register("nip")} />
            <FieldDescription>Kosongkan bila Anda non-ASN.</FieldDescription>
            <FieldError errors={[formState.errors.nip]} />
          </Field>
          <Field data-invalid={!!formState.errors.email}>
            <FieldLabel htmlFor="minta-email">
              Email pribadi
            </FieldLabel>
            <Input id="minta-email" type="email" placeholder="Masukkan email" autoComplete="email" maxLength={255} className="h-11" aria-invalid={!!formState.errors.email} {...register("email")} />
            <FieldError errors={[formState.errors.email]} />
          </Field>
          <Field data-invalid={!!formState.errors.catatan}>
            <FieldLabel htmlFor="minta-catatan">Catatan untuk administrator</FieldLabel>
            <Textarea id="minta-catatan" rows={3} maxLength={500} {...register("catatan")} />
            <FieldDescription>Tulis bidang Anda agar mudah diperiksa.</FieldDescription>
            <FieldError errors={[formState.errors.catatan]} />
          </Field>
        </FieldGroup>
        <Button type="submit" className="h-11 w-full" disabled={ajukan.isPending}>
          {ajukan.isPending && <Spinner />}
          {ajukan.isPending ? "Mengirim..." : "Kirim ke administrator"}
        </Button>
        <Link href="/login" className="mx-auto inline-flex items-center gap-1.5 rounded text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none pointer-coarse:min-h-11">
          <ArrowLeft aria-hidden className="size-4" />
          Kembali ke halaman masuk
        </Link>
      </form>
    </>
  );
}
