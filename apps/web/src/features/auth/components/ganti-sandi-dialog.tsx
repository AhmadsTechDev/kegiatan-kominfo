// =============================================================================
// MODAL DIALOG GANTI KATA SANDI (GantiSandiDialog)
// =============================================================================
// Gunanya: Menyediakan modal formulir bagi pengguna yang sedang masuk untuk memperbarui
// kata sandinya sendiri sekaligus mencabut sesi di perangkat lain.
//
// Isi berkas:
//   - GantiSandiDialog : komponen dialog modal pembaruan kata sandi mandiri pengguna
//
// Cara kerja:
//   1. Mengelola input kata sandi saat ini, kata sandi baru, dan konfirmasi kata sandi.
//   2. Memeriksa kebijakan sandi di klien (lib/sandi.ts) dan memastikan sandi baru berbeda.
//   3. Mengirim PATCH /api/me/sandi; sesi di perangkat lain dicabut, sesi ini tetap.
//   4. Galat 422 dari backend (sandiLama/sandiBaru) dipetakan ke input yang sesuai.
//
// Catatan penting:
//   - Pemilik akun menerima email pemberitahuan setiap kali kata sandi diganti.
//
// Dipakai oleh: UserMenu dan panel Keamanan di halaman Pengaturan
// =============================================================================

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { FormDialog, Wajib } from "@/components/shared/form-dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useGantiSandi } from "@/features/pengaturan/hooks/use-akun-saya";
import { ApiError } from "@/lib/api-client";
import { periksaSandi } from "@/lib/sandi";
import { useCurrentUser } from "../hooks/use-current-user";

const schema = (email?: string) =>
  z
    .object({ sandiLama: z.string().min(1, "Kata sandi saat ini wajib diisi"), sandiBaru: z.string(), ulang: z.string() })
    .superRefine((v, ctx) => {
      const salah = periksaSandi(v.sandiBaru, email);
      if (salah) ctx.addIssue({ code: "custom", path: ["sandiBaru"], message: salah });
      else if (v.sandiBaru === v.sandiLama) ctx.addIssue({ code: "custom", path: ["sandiBaru"], message: "Kata sandi baru harus berbeda dari yang lama" });
      if (v.sandiBaru !== v.ulang) ctx.addIssue({ code: "custom", path: ["ulang"], message: "Kata sandi tidak sama" });
    });
type Nilai = { sandiLama: string; sandiBaru: string; ulang: string };

export function GantiSandiDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { user } = useCurrentUser();
  const ganti = useGantiSandi();
  const [galat, setGalat] = useState<string | null>(null);
  const { register, handleSubmit, setError, reset, formState } = useForm<Nilai>({
    resolver: zodResolver(schema(user?.email)),
    defaultValues: { sandiLama: "", sandiBaru: "", ulang: "" },
  });

  const tutup = (v: boolean) => {
    if (!v) {
      reset();
      setGalat(null);
    }
    onOpenChange(v);
  };

  const kirim = handleSubmit((v) => {
    setGalat(null);
    ganti.mutate(
      { sandiLama: v.sandiLama, sandiBaru: v.sandiBaru, cabutSesiLain: true },
      {
        onSuccess: (h) => {
          toast.success(h.sesiDicabut > 0 ? `Kata sandi diganti. ${h.sesiDicabut} sesi di perangkat lain dikeluarkan.` : "Kata sandi diganti.");
          tutup(false);
        },
        onError: (e) => {
          const kolom = e instanceof ApiError && e.status === 422 ? e.details?.find((d) => d.field === "sandiLama" || d.field === "sandiBaru") : undefined;
          if (kolom) setError(kolom.field as "sandiLama" | "sandiBaru", { message: kolom.message }, { shouldFocus: true });
          else setGalat(e.message);
        },
      },
    );
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={tutup}
      title="Ganti kata sandi"
      description="Sesi di perangkat lain akan dikeluarkan. Gunakan kata sandi yang tidak dipakai di layanan lain."
      onSubmit={kirim}
      pending={ganti.isPending}
      submitLabel="Ganti kata sandi"
      galat={galat}
    >
      <input type="email" name="username" autoComplete="username" value={user?.email ?? ""} readOnly hidden />
      <Field data-invalid={!!formState.errors.sandiLama}>
        <FieldLabel htmlFor="sandi-lama">
          Kata sandi saat ini <Wajib />
        </FieldLabel>
        <Input id="sandi-lama" type="password" aria-required autoComplete="current-password" className="h-10" aria-invalid={!!formState.errors.sandiLama} autoFocus {...register("sandiLama")} />
        <FieldError errors={[formState.errors.sandiLama]} />
      </Field>
      <Field data-invalid={!!formState.errors.sandiBaru}>
        <FieldLabel htmlFor="sandi-baru">
          Kata sandi baru <Wajib />
        </FieldLabel>
        <Input id="sandi-baru" type="password" aria-required autoComplete="new-password" className="h-10" aria-invalid={!!formState.errors.sandiBaru} {...register("sandiBaru")} />
        <FieldError errors={[formState.errors.sandiBaru]} />
      </Field>
      <Field data-invalid={!!formState.errors.ulang}>
        <FieldLabel htmlFor="sandi-ulang">
          Ulangi kata sandi baru <Wajib />
        </FieldLabel>
        <Input id="sandi-ulang" type="password" aria-required autoComplete="new-password" className="h-10" aria-invalid={!!formState.errors.ulang} {...register("ulang")} />
        <FieldError errors={[formState.errors.ulang]} />
      </Field>
    </FormDialog>
  );
}
