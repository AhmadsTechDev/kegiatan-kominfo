"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { FormDialog } from "@/components/shared/form-dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LABEL_ROLE, type Role } from "@/types/auth";
import type { IsiUndangan } from "../types";
import { useBidangAdmin } from "../hooks/use-admin";
import { PilihUnit, terapkanGalatServer } from "./admin-shared";

/**
 * Dialog kirim email undangan aktivasi akun (role PEGAWAI atau PIMPINAN)
 */

const ROLE_UNDANGAN: Role[] = ["PEGAWAI", "PIMPINAN", "ADMIN"];

const schema = z.object({
  email: z.email("Email tidak valid").max(255),
  role: z.enum(["PEGAWAI", "PIMPINAN", "ADMIN"]),
  bidangId: z.string(),
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
    defaultValues: { email: defaultEmail, role: defaultRole, bidangId: "" },
  });

  const kirim = handleSubmit((v) => {
    setGalat(null);

    /**
     * Setiap akun tertaut ke data pegawai, jadi pemohon tanpa data pegawai wajib diberi bidang
     */
    if (pilihUnit && !v.bidangId) return setError("bidangId", { message: "Bidang wajib dipilih" });
    const isi: IsiUndangan = { email: v.email.trim().toLowerCase(), role: v.role };
    if (pilihUnit) Object.assign(isi, { bidangId: Number(v.bidangId) });
    onSubmit(isi, (e) => setGalat(terapkanGalatServer(e, setError, { email: "email", role: "role", bidangId: "bidangId" }) || null));
  });

  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title={title}
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
          Email pribadi
        </FieldLabel>
        <Input
          id="undang-email"
          type="email"
          autoComplete="off"
          maxLength={255}
          className="h-10"
          aria-required
          placeholder="Masukkan email"
          aria-invalid={!!formState.errors.email}
          {...register("email")}
        />
        <FieldError errors={[formState.errors.email]} />
      </Field>
      <Field data-invalid={!!formState.errors.role}>
        <FieldLabel htmlFor="undang-role">
          Role
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
          <Field data-invalid={!!formState.errors.bidangId}>
            <FieldLabel htmlFor="undang-unit">
              Bidang
            </FieldLabel>
            <Controller
              control={control}
              name="bidangId"
              render={({ field }) => (
                <PilihUnit id="undang-unit" unit={unit.data ?? []} value={field.value} onChange={field.onChange} invalid={!!formState.errors.bidangId} required />
              )}
            />
            <FieldError errors={[formState.errors.bidangId]} />
          </Field>
        </>
      )}
    </FormDialog>
  );
}
