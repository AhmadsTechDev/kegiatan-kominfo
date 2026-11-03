// =============================================================================
// DIALOG FORMULIR PENGIRIMAN UNDANGAN AKUN
// =============================================================================
// Gunanya: menyediakan modal dialog untuk mengirimkan surel undangan aktivasi
// akun baru kepada calon pengguna (role PEGAWAI atau PIMPINAN).
//
// Isi berkas:
//   - UndangDialog : dialog formulir email pribadi, role, serta bidang dan jabatan (bila belum ada data pegawai)
//
// Cara kerja:
//   1. Administrator menentukan surel tujuan dan role hak akses calon pengguna.
//   2. Jika pemohon tidak memiliki NIP, dialog menyediakan pemilih bidang terkait.
//   3. Saat form dikirim, backend membuat akun tertunda dan mengirim surel aktivasi.
//
// Catatan penting:
//   - Tautan aktivasi akun yang dikirimkan ke surel berlaku selama 72 jam.
//   - Semua role (Pegawai, Pimpinan, Admin) bisa diundang.
//   - Tanpa autofocus: di HP keyboard tidak langsung muncul menutupi dialog.
//   - Pegawai wajib memiliki bidang agar dapat melakukan pencatatan kegiatan dinas.
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
import { useBidangAdmin } from "../hooks/use-admin";
import { PilihUnit, terapkanGalatServer } from "./admin-shared";

const ROLE_UNDANGAN: Role[] = ["PEGAWAI", "PIMPINAN", "ADMIN"];

const schema = z.object({
  email: z.email("Email tidak valid").max(255),
  role: z.enum(["PEGAWAI", "PIMPINAN", "ADMIN"]),
  bidangId: z.string(),
  jabatan: z.string().trim().max(150, "Jabatan maksimal 150 karakter"),
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
  const unit = useBidangAdmin();
  const [galat, setGalat] = useState<string | null>(null);
  const { register, control, handleSubmit, setError, formState } = useForm<Nilai>({
    resolver: zodResolver(schema),
    defaultValues: { email: defaultEmail, role: defaultRole, bidangId: "", jabatan: "" },
  });

  const kirim = handleSubmit((v) => {
    setGalat(null);
    // Setiap akun tertaut ke data pegawai, jadi pemohon tanpa data pegawai wajib diberi bidang dan jabatan
    if (pilihUnit && !v.bidangId) setError("bidangId", { message: "Bidang wajib dipilih" });
    if (pilihUnit && !v.jabatan) setError("jabatan", { message: "Jabatan wajib diisi" });
    if (pilihUnit && (!v.bidangId || !v.jabatan)) return;
    const isi: IsiUndangan = { email: v.email.trim().toLowerCase(), role: v.role };
    if (pilihUnit) Object.assign(isi, { bidangId: Number(v.bidangId), jabatan: v.jabatan });
    onSubmit(isi, (e) => setGalat(terapkanGalatServer(e, setError, { email: "email", role: "role", bidangId: "bidangId", jabatan: "jabatan" }) || null));
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
          Email pribadi <Wajib />
        </FieldLabel>
        <Input
          id="undang-email"
          type="email"
          autoComplete="off"
          maxLength={255}
          className="h-10"
          aria-required
          placeholder="nama@contoh.com"
          aria-invalid={!!formState.errors.email}
          {...register("email")}
        />
        <FieldDescription>Email ini menjadi identitas login. Pastikan sudah diverifikasi bersama pegawainya.</FieldDescription>
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
              <SelectTrigger id="undang-role" className="h-10 w-full" aria-required>
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
          <Field data-invalid={!!formState.errors.jabatan}>
            <FieldLabel htmlFor="undang-jabatan">
              Jabatan <Wajib />
            </FieldLabel>
            <Input id="undang-jabatan" maxLength={150} className="h-10" aria-required aria-invalid={!!formState.errors.jabatan} {...register("jabatan")} />
            <FieldError errors={[formState.errors.jabatan]} />
          </Field>
          <Field data-invalid={!!formState.errors.bidangId}>
            <FieldLabel htmlFor="undang-unit">
              Bidang <Wajib />
            </FieldLabel>
            <Controller
              control={control}
              name="bidangId"
              render={({ field }) => (
                <PilihUnit id="undang-unit" unit={unit.data ?? []} value={field.value} onChange={field.onChange} invalid={!!formState.errors.bidangId} required />
              )}
            />
            <FieldDescription>Data pegawainya dibuat otomatis dengan unit dan jabatan ini, tanpa NIP.</FieldDescription>
            <FieldError errors={[formState.errors.bidangId]} />
          </Field>
        </>
      )}
    </FormDialog>
  );
}
