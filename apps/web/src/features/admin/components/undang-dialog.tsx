// =============================================================================
// DIALOG FORMULIR PENGIRIMAN UNDANGAN AKUN
// =============================================================================
// Gunanya: menyediakan modal dialog untuk mengirimkan surel undangan aktivasi
// akun baru kepada calon pengguna (role PEGAWAI atau PIMPINAN).
//
// Isi berkas:
//   - UndangDialog : dialog formulir masukan surel, pemilihan role, dan unit kerja
//
// Cara kerja:
//   1. Administrator menentukan surel tujuan dan role hak akses calon pengguna.
//   2. Jika pemohon tidak memiliki NIP, dialog menyediakan pemilih unit kerja terkait.
//   3. Saat form dikirim, backend membuat akun tertunda dan mengirim surel aktivasi.
//
// Catatan penting:
//   - Tautan aktivasi akun yang dikirimkan ke surel berlaku selama 72 jam.
//   - Role ADMIN tidak dapat dibuat via undangan, melainkan lewat pembuatan akun manual.
//   - Pegawai wajib memiliki unit kerja agar dapat melakukan pencatatan kegiatan dinas.
//
// Dipakai oleh: permintaan-tab.tsx, pegawai-tab.tsx, akun-view.tsx
// =============================================================================

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { FormDialog, Wajib } from "@/components/shared/form-dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LABEL_ROLE, type Role } from "@/types/auth";
import type { IsiUndangan } from "../types";
import { useUnitKerjaAdmin } from "../hooks/use-admin";
import { PilihUnit, terapkanGalatServer } from "./admin-shared";

const ROLE_UNDANGAN: Role[] = ["PEGAWAI", "PIMPINAN"];

const schema = z.object({
  email: z.email("Email tidak valid").max(255),
  role: z.enum(["PEGAWAI", "PIMPINAN", "ADMIN"]),
  unitKerjaId: z.string(),
});
type Nilai = z.infer<typeof schema>;

type Props = {
  title: string;
  penerima: React.ReactNode;
  defaultEmail?: string;
  defaultRole?: Role;
  submitLabel: string;
  pending: boolean;
  onSubmit: (isi: IsiUndangan, gagal: (e: unknown) => void) => void;
  onClose: () => void;
  pilihUnit?: boolean;
};

export function UndangDialog({ title, penerima, defaultEmail = "", defaultRole = "PEGAWAI", submitLabel, pending, onSubmit, onClose, pilihUnit }: Props) {
  const unit = useUnitKerjaAdmin();
  const [galat, setGalat] = useState<string | null>(null);
  const { register, control, handleSubmit, setError, formState } = useForm<Nilai>({
    resolver: zodResolver(schema),
    defaultValues: { email: defaultEmail, role: defaultRole, unitKerjaId: "" },
  });

  const kirim = handleSubmit((v) => {
    setGalat(null);
    if (pilihUnit && v.role === "PEGAWAI" && !v.unitKerjaId) {
      return setError("unitKerjaId", { message: "Pilih unit kerja agar pegawai bisa mencatat kegiatan" });
    }
    const isi: IsiUndangan = { email: v.email.trim().toLowerCase(), role: v.role };
    if (pilihUnit && v.unitKerjaId) Object.assign(isi, { unitKerjaId: Number(v.unitKerjaId) });
    onSubmit(isi, (e) => setGalat(terapkanGalatServer(e, setError, { email: "email", role: "role", unitKerjaId: "unitKerjaId" }) || null));
  });

  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title={title}
      description="Pegawai akan menerima email berisi tautan untuk membuat kata sandi dan mengaktifkan akun. Tautan berlaku 72 jam."
      onSubmit={kirim}
      pending={pending}
      submitLabel={submitLabel}
      galat={galat}
    >
      <div className="flex items-center gap-3 rounded-xl bg-muted/70 p-3 text-sm">
        <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
          <MailCheck className="size-4" />
        </span>
        <div className="min-w-0">{penerima}</div>
      </div>
      <Field data-invalid={!!formState.errors.email}>
        <FieldLabel htmlFor="undang-email">
          Email pegawai <Wajib />
        </FieldLabel>
        <Input
          id="undang-email"
          type="email"
          autoComplete="off"
          maxLength={255}
          className="h-10"
          placeholder="nama@palembang.go.id"
          aria-invalid={!!formState.errors.email}
          autoFocus
          {...register("email")}
        />
        <FieldDescription>Utamakan email dinas. Email ini juga dipakai untuk masuk ke aplikasi.</FieldDescription>
        <FieldError errors={[formState.errors.email]} />
      </Field>
      <Field data-invalid={!!formState.errors.role}>
        <FieldLabel htmlFor="undang-role">
          Role <Wajib />
        </FieldLabel>
        <Controller
          control={control}
          name="role"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="undang-role" className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_UNDANGAN.map((r) => (
                  <SelectItem key={r} value={r}>
                    {LABEL_ROLE[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError errors={[formState.errors.role]} />
      </Field>
      {pilihUnit && (
        <>
          <Field data-invalid={!!formState.errors.unitKerjaId}>
            <FieldLabel htmlFor="undang-unit">Unit kerja</FieldLabel>
            <Controller
              control={control}
              name="unitKerjaId"
              render={({ field }) => (
                <PilihUnit id="undang-unit" unit={unit.data ?? []} value={field.value} onChange={field.onChange} invalid={!!formState.errors.unitKerjaId} />
              )}
            />
            <FieldDescription>Data pegawainya dibuat otomatis dengan unit ini, tanpa NIP.</FieldDescription>
            <FieldError errors={[formState.errors.unitKerjaId]} />
          </Field>
        </>
      )}
    </FormDialog>
  );
}
