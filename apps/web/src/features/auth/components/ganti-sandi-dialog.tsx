// =============================================================================
// MODAL DIALOG GANTI KATA SANDI (GantiSandiDialog)
// =============================================================================
// Gunanya: Menyediakan modal formulir bagi pengguna yang sedang masuk untuk memperbarui
// kata sandinya sendiri via Better Auth sekaligus mencabut sesi di perangkat lain.
//
// Isi berkas:
//   - GantiSandiDialog : komponen dialog modal pembaruan kata sandi mandiri pengguna
//
// Cara kerja:
//   1. Mengelola input kata sandi saat ini, kata sandi baru, dan konfirmasi kata sandi.
//   2. Memvalidasi bahwa kata sandi baru minimal 10 karakter dan berbeda dari kata sandi lama.
//   3. Mengirim perubahan sandi ke backend menggunakan authClient.changePassword.
//   4. Menampilkan notifikasi sukses sonner toast dan menutup modal, atau memetakan galat form.
//
// Catatan penting:
//   - Memenuhi FR-01 dan NFR-01: panjang sandi minimal 10 karakter sesuai standar Better Auth.
//   - Opsi revokeOtherSessions diaktifkan untuk mengeluarkan sesi di perangkat lain demi keamanan.
//
// Dipakai oleh: UserMenu (frontend/src/components/layout/user-menu.tsx)
// =============================================================================

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { FormDialog, Wajib } from "@/components/shared/form-dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

const schema = z
  .object({
    sandiLama: z.string().min(1, "Kata sandi saat ini wajib diisi"),
    sandiBaru: z.string().min(10, "Kata sandi baru minimal 10 karakter").max(128, "Kata sandi maksimal 128 karakter"),
    ulang: z.string(),
  })
  .refine((v) => v.sandiBaru === v.ulang, { path: ["ulang"], message: "Kata sandi tidak sama" })
  .refine((v) => v.sandiBaru !== v.sandiLama, { path: ["sandiBaru"], message: "Kata sandi baru harus berbeda dari yang lama" });
type Nilai = z.infer<typeof schema>;

export function GantiSandiDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [pending, setPending] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const { register, handleSubmit, setError, reset, formState } = useForm<Nilai>({
    resolver: zodResolver(schema),
    defaultValues: { sandiLama: "", sandiBaru: "", ulang: "" },
  });

  const tutup = (v: boolean) => {
    if (!v) {
      reset();
      setGalat(null);
    }
    onOpenChange(v);
  };

  const kirim = handleSubmit(async (v) => {
    setGalat(null);
    setPending(true);
    const { error } = await authClient.changePassword({
      currentPassword: v.sandiLama,
      newPassword: v.sandiBaru,
      revokeOtherSessions: true,
    });
    setPending(false);
    if (!error) {
      toast.success("Kata sandi diganti. Sesi di perangkat lain telah dikeluarkan.");
      return tutup(false);
    }
    if (error.code === "INVALID_PASSWORD") return setError("sandiLama", { message: "Kata sandi saat ini salah" }, { shouldFocus: true });
    if (error.code === "PASSWORD_TOO_SHORT") return setError("sandiBaru", { message: "Kata sandi baru minimal 10 karakter" }, { shouldFocus: true });
    setGalat(error.status === 429 ? "Terlalu banyak percobaan. Coba lagi sebentar lagi." : "Kata sandi gagal diganti. Coba lagi beberapa saat.");
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={tutup}
      title="Ganti kata sandi"
      description="Gunakan kata sandi yang tidak dipakai di layanan lain."
      onSubmit={kirim}
      pending={pending}
      submitLabel="Ganti kata sandi"
      galat={galat}
    >
      <Field data-invalid={!!formState.errors.sandiLama}>
        <FieldLabel htmlFor="sandi-lama">
          Kata sandi saat ini <Wajib />
        </FieldLabel>
        <Input id="sandi-lama" type="password" autoComplete="current-password" className="h-10" aria-invalid={!!formState.errors.sandiLama} autoFocus {...register("sandiLama")} />
        <FieldError errors={[formState.errors.sandiLama]} />
      </Field>
      <Field data-invalid={!!formState.errors.sandiBaru}>
        <FieldLabel htmlFor="sandi-baru">
          Kata sandi baru <Wajib />
        </FieldLabel>
        <Input id="sandi-baru" type="password" autoComplete="new-password" className="h-10" aria-invalid={!!formState.errors.sandiBaru} {...register("sandiBaru")} />
        <FieldDescription>Minimal 10 karakter.</FieldDescription>
        <FieldError errors={[formState.errors.sandiBaru]} />
      </Field>
      <Field data-invalid={!!formState.errors.ulang}>
        <FieldLabel htmlFor="sandi-ulang">
          Ulangi kata sandi baru <Wajib />
        </FieldLabel>
        <Input id="sandi-ulang" type="password" autoComplete="new-password" className="h-10" aria-invalid={!!formState.errors.ulang} {...register("ulang")} />
        <FieldError errors={[formState.errors.ulang]} />
      </Field>
    </FormDialog>
  );
}
