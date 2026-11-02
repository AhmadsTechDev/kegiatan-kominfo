// =============================================================================
// PANEL INFORMASI AKUN DAN GANTI EMAIL
// =============================================================================
// Gunanya: Menampilkan email pribadi (login), status verifikasi email, role, status akun,
// dan tanggal pembuatan akun, serta alur pengajuan ganti email.
//
// Isi berkas:
//   - GantiEmailDialog : formulir email baru + kata sandi saat ini (PATCH /me/email)
//   - PanelAkun        : rincian akun, pemberitahuan email yang menunggu verifikasi, tombol batal
//
// Cara kerja:
//   1. Pengguna mengajukan email baru; tautan verifikasi dikirim ke email baru.
//   2. Selama belum diverifikasi, email lama tetap dipakai untuk login dan ditampilkan.
//   3. Pengajuan bisa dibatalkan; tautan yang sudah terkirim ikut tidak berlaku.
//
// Dipakai oleh: frontend/src/features/pengaturan/components/pengaturan-view.tsx
// =============================================================================

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { BadgeCheck, CircleAlert, MailWarning, Pencil } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FormDialog, Wajib } from "@/components/shared/form-dialog";
import { Panel, PanelHeader } from "@/components/shared/panel";
import { StatusAkunBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { terapkanGalatServer } from "@/features/admin/components/admin-shared";
import type { Profil } from "@/features/auth/hooks/use-profil";
import { formatTanggal, formatTanggalJam } from "@/lib/format";
import { LABEL_ROLE } from "@/types/auth";
import { useBatalGantiEmail, useGantiEmail } from "../hooks/use-akun-saya";
import { Baris } from "./panel-profil";

const schemaEmail = (lama: string) =>
  z.object({
    email: z
      .string()
      .trim()
      .min(1, "Email baru wajib diisi")
      .pipe(z.email("Format email tidak valid"))
      .refine((v) => v.toLowerCase() !== lama.toLowerCase(), "Email baru sama dengan email saat ini"),
    password: z.string().min(1, "Kata sandi saat ini wajib diisi"),
  });
type NilaiEmail = { email: string; password: string };

function GantiEmailDialog({ emailLama, onClose }: { emailLama: string; onClose: () => void }) {
  const ganti = useGantiEmail();
  const [galat, setGalat] = useState<string | null>(null);
  const { register, handleSubmit, setError, formState } = useForm<NilaiEmail>({ resolver: zodResolver(schemaEmail(emailLama)), defaultValues: { email: "", password: "" } });

  const kirim = handleSubmit((v) => {
    setGalat(null);
    ganti.mutate(v, {
      onSuccess: (h) => {
        toast.success(`Tautan verifikasi dikirim ke ${h.emailBaru}. Buka email itu untuk menyelesaikan perubahan.`);
        onClose();
      },
      onError: (e) => setGalat(terapkanGalatServer(e, setError, { email: "email", password: "password" }) || null),
    });
  });

  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title="Ganti email"
      description="Tautan verifikasi dikirim ke email baru. Sampai diverifikasi, Anda tetap masuk dengan email saat ini."
      onSubmit={kirim}
      pending={ganti.isPending}
      submitLabel="Kirim tautan verifikasi"
      galat={galat}
    >
      <Field data-invalid={!!formState.errors.email}>
        <FieldLabel htmlFor="email-baru">
          Email pribadi baru <Wajib />
        </FieldLabel>
        <Input id="email-baru" type="email" aria-required inputMode="email" autoComplete="email" maxLength={255} className="h-10" autoFocus aria-invalid={!!formState.errors.email} {...register("email")} />
        <FieldError errors={[formState.errors.email]} />
      </Field>
      <Field data-invalid={!!formState.errors.password}>
        <FieldLabel htmlFor="email-sandi">
          Kata sandi saat ini <Wajib />
        </FieldLabel>
        <Input id="email-sandi" type="password" aria-required autoComplete="current-password" className="h-10" aria-invalid={!!formState.errors.password} {...register("password")} />
        <FieldDescription>Untuk memastikan perubahan ini dilakukan oleh Anda.</FieldDescription>
        <FieldError errors={[formState.errors.password]} />
      </Field>
    </FormDialog>
  );
}

export function PanelAkun({ p }: { p: Profil }) {
  const [gantiEmail, setGantiEmail] = useState(false);
  const [konfirmasiBatal, setKonfirmasiBatal] = useState(false);
  const batal = useBatalGantiEmail();

  return (
    <Panel className="h-fit">
      <PanelHeader
        title="Informasi akun"
        description="Email pribadi adalah identitas login Anda."
        action={
          <Button variant="outline" size="sm" className="h-9 pointer-coarse:min-h-11" onClick={() => setGantiEmail(true)}>
            <Pencil aria-hidden />
            Ganti email
          </Button>
        }
      />
      {p.emailBaru && (
        <div role="status" className="mx-5 mb-4 flex flex-col gap-2 rounded-xl bg-status-berlangsung px-4 py-3 text-sm text-status-berlangsung-foreground sm:flex-row sm:items-center md:mx-6">
          <MailWarning aria-hidden className="size-5 shrink-0" />
          <p className="min-w-0 flex-1">
            Menunggu verifikasi <span className="font-semibold break-all">{p.emailBaru}</span>. Buka tautan di email tersebut. Sampai saat itu, masuk tetap dengan email saat ini.
          </p>
          <Button variant="ghost" size="sm" className="h-9 pointer-coarse:min-h-11 shrink-0 self-start sm:self-auto" onClick={() => setKonfirmasiBatal(true)}>
            Batalkan
          </Button>
        </div>
      )}
      <dl className="divide-y divide-muted border-t border-muted">
        <Baris label="Email pribadi">
          <span className="flex flex-wrap items-center gap-2">
            <span className="break-all">{p.email}</span>
            {p.emailVerified ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-status-selesai-foreground">
                <BadgeCheck aria-hidden className="size-3.5" />
                Terverifikasi
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-status-berlangsung-foreground">
                <CircleAlert aria-hidden className="size-3.5" />
                Belum terverifikasi
              </span>
            )}
          </span>
        </Baris>
        <Baris label="Role">{LABEL_ROLE[p.role]}</Baris>
        <Baris label="Status akun">
          <StatusAkunBadge status={p.status} />
        </Baris>
        <Baris label="Dibuat pada">
          <time dateTime={p.createdAt} title={formatTanggalJam(p.createdAt)}>
            {formatTanggal(p.createdAt)}
          </time>
        </Baris>
      </dl>

      {gantiEmail && <GantiEmailDialog emailLama={p.email} onClose={() => setGantiEmail(false)} />}
      <ConfirmDialog
        open={konfirmasiBatal}
        onOpenChange={setKonfirmasiBatal}
        title="Batalkan ganti email?"
        description={`Tautan verifikasi yang sudah dikirim ke ${p.emailBaru ?? "email baru"} tidak akan berlaku lagi.`}
        confirmLabel="Batalkan perubahan"
        pendingLabel="Membatalkan..."
        pending={batal.isPending}
        onConfirm={() =>
          batal.mutate(undefined, {
            onSuccess: () => {
              toast.success("Perubahan email dibatalkan");
              setKonfirmasiBatal(false);
            },
            onError: (e) => toast.error(e.message),
          })
        }
      />
    </Panel>
  );
}
