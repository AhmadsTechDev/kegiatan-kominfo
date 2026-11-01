// =============================================================================
// KOMPONEN FORMULIR PERMINTAAN AKUN (MintaAkunForm)
// =============================================================================
// Gunanya: Menyediakan formulir pengajuan akun baru bagi pegawai atau non-ASN kepada admin,
// mencakup nama, NIP (opsional), email dinas, catatan, serta visualisasi status hasil.
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
import { Wajib } from "@/components/shared/form-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api-client";
import { zNip } from "@/lib/nip";
import { ajukanPermintaanAkun } from "../api/akun-publik";

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
  const { register, handleSubmit, setError, formState, getValues } = useForm<Nilai>({
    resolver: zodResolver(schema),
    defaultValues: { nama: "", nip: "", email: "", catatan: "" },
  });

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
          <h2 className="font-heading text-xl font-extrabold">Permintaan terkirim</h2>
          <p className="text-sm text-muted-foreground">
            Administrator akan meninjau permintaan Anda. Bila disetujui, tautan aktivasi dikirim ke <span className="font-semibold text-foreground">{getValues("email")}</span>.
          </p>
        </div>
        <Button asChild variant="outline" className="h-10">
          <Link href="/login">
            <ArrowLeft aria-hidden />
            Kembali ke halaman masuk
          </Link>
        </Button>
      </div>
    );
  }

  return (
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
            Nama lengkap <Wajib />
          </FieldLabel>
          <Input id="minta-nama" autoComplete="name" maxLength={150} className="h-11" autoFocus aria-invalid={!!formState.errors.nama} {...register("nama")} />
          <FieldError errors={[formState.errors.nama]} />
        </Field>
        <Field data-invalid={!!formState.errors.nip}>
          <FieldLabel htmlFor="minta-nip">
            NIP <span className="font-normal text-muted-foreground">(opsional)</span>
          </FieldLabel>
          <Input id="minta-nip" inputMode="numeric" maxLength={18} placeholder="18 digit" className="h-11 tabular-nums" aria-invalid={!!formState.errors.nip} {...register("nip")} />
          <FieldError errors={[formState.errors.nip]} />
        </Field>
        <Field data-invalid={!!formState.errors.email}>
          <FieldLabel htmlFor="minta-email">
            Email <Wajib />
          </FieldLabel>
          <Input id="minta-email" type="email" autoComplete="email" maxLength={255} className="h-11" aria-invalid={!!formState.errors.email} {...register("email")} />
          <FieldError errors={[formState.errors.email]} />
        </Field>
        <Field data-invalid={!!formState.errors.catatan}>
          <FieldLabel htmlFor="minta-catatan">Catatan untuk administrator</FieldLabel>
          <Textarea id="minta-catatan" rows={2} maxLength={500} {...register("catatan")} />
          <FieldError errors={[formState.errors.catatan]} />
        </Field>
      </FieldGroup>
      <Button type="submit" className="h-11 w-full" disabled={ajukan.isPending}>
        {ajukan.isPending && <Spinner />}
        {ajukan.isPending ? "Mengirim..." : "Kirim permintaan"}
      </Button>
      <Link href="/login" className="mx-auto inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft aria-hidden className="size-4" />
        Kembali ke halaman masuk
      </Link>
    </form>
  );
}
