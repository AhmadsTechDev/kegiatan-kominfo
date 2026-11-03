// =============================================================================
// FORMULIR DAN AKSI AKUN (DIPAKAI DAFTAR DAN DETAIL AKUN)
// =============================================================================
// Gunanya: Menyatukan formulir Buat/Ubah akun dan seluruh dialog konfirmasi aksi akun
// agar perilakunya sama di halaman daftar akun dan halaman detail akun.
//
// Isi berkas:
//   - AkunRingkas      : bentuk data akun minimum yang dibutuhkan formulir dan aksi
//   - dariAdmin, dariDetail : mengubah data daftar/detail menjadi AkunRingkas
//   - AkunFormDialog   : formulir Buat/Ubah akun (nama, email pribadi, NIP opsional, unit, role)
//   - useAksiAkun      : membuka aksi (ubah, kirim ulang undangan, reset sandi, cabut sesi,
//                        nonaktifkan, pulihkan, hapus) dan merender dialog konfirmasinya
//   - ItemAksiAkun     : butir menu dropdown sesuai status akun
//
// Cara kerja:
//   1. Akun dibuat tanpa kata sandi; backend mengirim tautan aktivasi ke email pribadi pemiliknya.
//   2. Reset kata sandi oleh admin mengirim tautan ke email pemilik; admin tidak menentukan kata sandi.
//   3. Setiap aksi penting meminta konfirmasi dan memberi umpan balik lewat toast.
//
// Catatan penting:
//   - Admin tidak dapat menonaktifkan, menghapus, atau mengubah role akunnya sendiri (juga ditolak backend).
//
// Dipakai oleh: akun-view.tsx, akun-detail-view.tsx
// =============================================================================

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, KeyRound, MonitorX, Pencil, PowerOff, RotateCcw, Send, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FormDialog } from "@/components/shared/form-dialog";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { tabIndexPilihan, tanganiPanah } from "@/lib/navigasi-panah";
import { cn } from "@/lib/utils";
import { LABEL_ROLE, type Role, type StatusAkun } from "@/types/auth";
import { useCabutSesiAkun, useHapusAkun, useKirimUlangUndangan, useResetSandi, useSimpanAkun, useStatusAkun, useBidangAdmin } from "../hooks/use-admin";
import type { AkunAdmin, AkunDetail, HasilSimpanAkun } from "../types";
import { PilihUnit, terapkanGalatServer } from "./admin-shared";

export type AkunRingkas = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: StatusAkun;
  bisaDihapus: boolean;
  nip: string | null;
  bidangId: number | null;
};

export const dariAdmin = (a: AkunAdmin): AkunRingkas => ({
  id: a.id,
  name: a.name,
  email: a.email,
  role: a.role,
  status: a.status,
  bisaDihapus: a.bisaDihapus,
  nip: a.pegawai?.nip ?? null,
  bidangId: a.pegawai?.bidangId ?? null,
});

export const dariDetail = (a: AkunDetail): AkunRingkas => ({
  id: a.id,
  name: a.name,
  email: a.email,
  role: a.role,
  status: a.status,
  bisaDihapus: a.bisaDihapus,
  nip: a.pegawai?.nip ?? null,
  bidangId: a.pegawai?.bidang.id ?? null,
});

const ROLE: Role[] = ["PEGAWAI", "PIMPINAN", "ADMIN"];
const KETERANGAN_ROLE: Record<Role, string> = {
  PEGAWAI: "Mencatat dan mengubah kegiatan unitnya",
  PIMPINAN: "Melihat dashboard, rekap, dan laporan tanpa mengubah data",
  ADMIN: "Mengelola akun, master data, dan audit log",
};

const schemaAkun = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi").max(150, "Nama maksimal 150 karakter"),
  email: z.string().trim().min(1, "Email wajib diisi").max(255).pipe(z.email("Email tidak valid")),
  nip: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{18}$/.test(v), "NIP harus 18 digit angka"),
  bidangId: z.string().min(1, "Bidang wajib dipilih"),
  role: z.enum(["PEGAWAI", "PIMPINAN", "ADMIN"]),
});
type NilaiAkun = z.infer<typeof schemaAkun>;

function PilihRole({ value, onChange, terkunci }: { value: Role; onChange: (r: Role) => void; terkunci?: boolean }) {
  return (
    <div
      role="radiogroup"
      aria-label="Role"
      aria-required
      className="grid gap-2 sm:grid-cols-3"
      onKeyDown={terkunci ? undefined : (e) => tanganiPanah(e, ROLE, value, onChange)}
    >
      {ROLE.map((r) => {
        const aktif = value === r;
        return (
          <button
            key={r}
            type="button"
            role="radio"
            aria-checked={aktif}
            tabIndex={tabIndexPilihan(r, value, ROLE[0])}
            disabled={terkunci && !aktif}
            onClick={() => onChange(r)}
            className={cn(
              "flex flex-col gap-0.5 rounded-xl border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
              aktif ? "border-primary bg-secondary" : "hover:bg-muted",
            )}
          >
            <span className={cn("text-sm font-semibold", aktif && "text-primary")}>{LABEL_ROLE[r]}</span>
            <span className="text-xs leading-snug text-muted-foreground">{KETERANGAN_ROLE[r]}</span>
          </button>
        );
      })}
    </div>
  );
}

// Pesan setelah simpan: undangan terkirim, atau peringatan bila email gagal (akun tetap tersimpan)
function beriTahu(h: HasilSimpanAkun, baru: boolean) {
  if (h.undangan?.galat) {
    toast.warning(`${baru ? "Akun dibuat" : "Akun diperbarui"}, tetapi email undangan gagal dikirim. Gunakan Kirim ulang undangan setelah SMTP diperbaiki.`);
  } else if (h.undangan) {
    toast.success(`${baru ? "Akun dibuat" : "Akun diperbarui"}. Tautan aktivasi dikirim ke ${h.undangan.email}.`);
  } else toast.success("Akun diperbarui");
}

export function AkunFormDialog({ akun, idSaya, onClose }: { akun: AkunRingkas | "baru"; idSaya?: string; onClose: () => void }) {
  const simpan = useSimpanAkun();
  const unit = useBidangAdmin();
  const [galat, setGalat] = useState<string | null>(null);
  const awal = akun === "baru" ? null : akun;
  const { register, control, handleSubmit, setError, formState } = useForm<NilaiAkun>({
    resolver: zodResolver(schemaAkun),
    defaultValues: {
      name: awal?.name ?? "",
      email: awal?.email ?? "",
      nip: awal?.nip ?? "",
      bidangId: awal?.bidangId ? String(awal.bidangId) : "",
      role: awal?.role ?? "PEGAWAI",
    },
  });
  const role = useWatch({ control, name: "role" });
  const email = useWatch({ control, name: "email" });
  const gantiEmail = awal && email.trim().toLowerCase() !== awal.email;

  const kirim = handleSubmit((v) => {
    setGalat(null);
    simpan.mutate(
      { id: awal?.id, isi: { name: v.name, email: v.email.toLowerCase(), nip: v.nip || null, bidangId: Number(v.bidangId), role: v.role } },
      {
        onSuccess: (h) => {
          beriTahu(h, !awal);
          onClose();
        },
        onError: (e) =>
          setGalat(
            terapkanGalatServer(e, setError, { name: "name", nama: "name", email: "email", nip: "nip", pegawaiId: "nip", bidangId: "bidangId", role: "role" }) ||
              null,
          ),
      },
    );
  });

  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title={awal ? `Ubah akun ${awal.name}` : "Buat akun"}
      description={
        awal
          ? "Data kepegawaian ini tampil di profil pengguna dan hanya bisa diubah admin."
          : "Pastikan identitas pegawai sudah diverifikasi. Tautan aktivasi dikirim ke email pribadinya; ia membuat kata sandi sendiri."
      }
      onSubmit={kirim}
      pending={simpan.isPending}
      submitLabel={awal ? "Simpan perubahan" : "Buat akun dan kirim undangan"}
      galat={galat}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field data-invalid={!!formState.errors.name} className="sm:col-span-2">
          <FieldLabel htmlFor="akun-nama">
            Nama lengkap
          </FieldLabel>
          <Input id="akun-nama" maxLength={150} className="h-10" aria-required aria-invalid={!!formState.errors.name} {...register("name")} />
          <FieldError errors={[formState.errors.name]} />
        </Field>
        <Field data-invalid={!!formState.errors.email} className="sm:col-span-2">
          <FieldLabel htmlFor="akun-email">
            Email pribadi
          </FieldLabel>
          <Input id="akun-email" type="email" placeholder="Masukkan email" inputMode="email" autoComplete="off" maxLength={255} className="h-10" aria-required aria-invalid={!!formState.errors.email} {...register("email")} />
          <FieldDescription>
            {gantiEmail
              ? awal?.status === "MENUNGGU_AKTIVASI"
                ? "Undangan baru dikirim ke email ini; tautan lama tidak berlaku."
                : "Email login berubah dan ditandai belum terverifikasi."
              : "Dipakai untuk masuk dan menerima tautan aktivasi."}
          </FieldDescription>
          <FieldError errors={[formState.errors.email]} />
        </Field>
        <Field data-invalid={!!formState.errors.nip}>
          <FieldLabel htmlFor="akun-nip">
            NIP
          </FieldLabel>
          <Input id="akun-nip" inputMode="numeric" maxLength={18} placeholder="Opsional, 18 digit" className="h-10 tabular-nums" aria-invalid={!!formState.errors.nip} {...register("nip")} />
          <FieldError errors={[formState.errors.nip]} />
        </Field>
      </div>

      <Field data-invalid={!!formState.errors.bidangId}>
        <FieldLabel htmlFor="akun-unit">
          Bidang
        </FieldLabel>
        <Controller
          control={control}
          name="bidangId"
          render={({ field }) => <PilihUnit id="akun-unit" unit={unit.data ?? []} value={field.value} onChange={field.onChange} invalid={!!formState.errors.bidangId} required />}
        />
        <FieldError errors={[formState.errors.bidangId]} />
      </Field>

      <Field data-invalid={!!formState.errors.role}>
        <FieldLabel>
          Role
        </FieldLabel>
        <Controller control={control} name="role" render={({ field }) => <PilihRole value={field.value} onChange={field.onChange} terkunci={awal?.id === idSaya} />} />
        {awal?.id === idSaya && <FieldDescription>Anda tidak dapat mengubah role akun Anda sendiri.</FieldDescription>}
        {awal && awal.id !== idSaya && role !== awal.role && <FieldDescription>Akun akan dikeluarkan dari semua sesinya setelah role diubah.</FieldDescription>}
        <FieldError errors={[formState.errors.role]} />
      </Field>
    </FormDialog>
  );
}

export type JenisAksi = "ubah" | "undang" | "reset" | "sesi" | "nonaktifkan" | "pulihkan" | "hapus";

export function useAksiAkun({ idSaya, setelahHapus }: { idSaya?: string; setelahHapus?: () => void } = {}) {
  const [aksi, setAksi] = useState<{ jenis: JenisAksi; akun: AkunRingkas } | null>(null);
  const [alasan, setAlasan] = useState("");
  const undang = useKirimUlangUndangan();
  const reset = useResetSandi();
  const sesi = useCabutSesiAkun();
  const status = useStatusAkun();
  const hapus = useHapusAkun();

  const tutup = () => {
    setAksi(null);
    setAlasan("");
  };
  const gagal = (e: Error) => toast.error(e.message);
  const buka = useCallback((jenis: JenisAksi, akun: AkunRingkas) => setAksi({ jenis, akun }), []);

  let dialog: React.ReactNode = null;
  if (aksi) {
    const a = aksi.akun;
    const konfirmasi = {
      open: true,
      onOpenChange: (v: boolean) => !v && tutup(),
    };
    if (aksi.jenis === "ubah") dialog = <AkunFormDialog akun={a} idSaya={idSaya} onClose={tutup} />;
    else if (aksi.jenis === "undang") {
      dialog = (
        <ConfirmDialog
          {...konfirmasi}
          title={`Kirim ulang undangan ke ${a.email}?`}
          description="Tautan aktivasi baru berlaku 72 jam. Tautan yang dikirim sebelumnya tidak berlaku lagi."
          confirmLabel="Kirim ulang undangan"
          confirmVariant="default"
          pendingLabel="Mengirim..."
          pending={undang.isPending}
          onConfirm={() => undang.mutate(a.id, { onSuccess: (h) => (toast.success(`Undangan dikirim ulang ke ${h.email}`), tutup()), onError: gagal })}
        />
      );
    } else if (aksi.jenis === "reset") {
      dialog = (
        <ConfirmDialog
          {...konfirmasi}
          title={`Kirim tautan atur ulang kata sandi ke ${a.name}?`}
          description={`Tautan dikirim ke ${a.email} dan berlaku 1 jam. Semua sesi akun ini dikeluarkan dan penguncian karena salah sandi dibuka. Anda tidak menentukan kata sandinya.`}
          confirmLabel="Kirim tautan"
          confirmVariant="default"
          pendingLabel="Mengirim..."
          pending={reset.isPending}
          onConfirm={() => reset.mutate(a.id, { onSuccess: (h) => (toast.success(`Tautan atur ulang kata sandi dikirim ke ${h.email}`), tutup()), onError: gagal })}
        />
      );
    } else if (aksi.jenis === "sesi") {
      dialog = (
        <ConfirmDialog
          {...konfirmasi}
          title={`Keluarkan ${a.name} dari semua perangkat?`}
          description={a.id === idSaya ? "Sesi lain milik Anda dikeluarkan; sesi yang sedang Anda pakai tetap." : "Pengguna harus masuk ulang dengan kata sandinya."}
          confirmLabel="Keluarkan dari semua perangkat"
          pendingLabel="Mengeluarkan..."
          pending={sesi.isPending}
          onConfirm={() => sesi.mutate(a.id, { onSuccess: (h) => (toast.success(`${h.jumlah} sesi dikeluarkan`), tutup()), onError: gagal })}
        />
      );
    } else if (aksi.jenis === "pulihkan") {
      dialog = (
        <ConfirmDialog
          {...konfirmasi}
          title={`Aktifkan kembali akun ${a.name}?`}
          description="Akun bisa dipakai masuk lagi. Akun yang belum pernah diaktivasi perlu dikirimi undangan baru."
          confirmLabel="Aktifkan kembali"
          confirmVariant="default"
          pendingLabel="Mengaktifkan..."
          pending={status.isPending}
          onConfirm={() =>
            status.mutate(
              { id: a.id, aktif: true },
              { onSuccess: () => (toast.success(`Akun ${a.name} aktif kembali`), tutup()), onError: gagal },
            )
          }
        />
      );
    } else if (aksi.jenis === "nonaktifkan") {
      dialog = (
        <ConfirmDialog
          {...konfirmasi}
          title={`Nonaktifkan akun ${a.name}?`}
          confirmLabel="Nonaktifkan akun"
          pendingLabel="Menonaktifkan..."
          pending={status.isPending}
          onConfirm={() =>
            status.mutate(
              { id: a.id, aktif: false, alasan: alasan.trim() },
              { onSuccess: () => (toast.success(`Akun ${a.name} dinonaktifkan`), tutup()), onError: gagal },
            )
          }
        >
          <Field>
            <FieldLabel htmlFor="alasan-nonaktif">Alasan</FieldLabel>
            <Input id="alasan-nonaktif" value={alasan} onChange={(e) => setAlasan(e.target.value)} maxLength={255} className="h-10" placeholder="Opsional, mis. pindah tugas" />
          </Field>
        </ConfirmDialog>
      );
    } else if (aksi.jenis === "hapus") {
      dialog = (
        <ConfirmDialog
          {...konfirmasi}
          title={`Hapus akun ${a.name}?`}
          description="Akun akan dihapus permanen. Data pegawainya tetap ada di Master data."
          confirmLabel="Hapus akun"
          pendingLabel="Menghapus..."
          pending={hapus.isPending}
          onConfirm={() =>
            hapus.mutate(a.id, {
              onSuccess: () => {
                toast.success(`Akun ${a.name} dihapus`);
                tutup();
                setelahHapus?.();
              },
              onError: gagal,
            })
          }
        />
      );
    }
  }

  return { buka, dialog };
}

// Butir menu setinggi 44 px di layar sentuh (R-03); ukuran desktop tidak berubah
const ITEM = "pointer-coarse:min-h-11";

export function ItemAksiAkun({ akun, idSaya, buka, denganDetail }: { akun: AkunRingkas; idSaya?: string; buka: (j: JenisAksi, a: AkunRingkas) => void; denganDetail?: boolean }) {
  const diriSendiri = akun.id === idSaya;
  return (
    <>
      {denganDetail && (
        <DropdownMenuItem className={ITEM} asChild>
          <Link href={`/admin/akun/${akun.id}`}>
            <Eye aria-hidden />
            Lihat detail
          </Link>
        </DropdownMenuItem>
      )}
      <DropdownMenuItem className={ITEM} onSelect={() => buka("ubah", akun)}>
        <Pencil aria-hidden />
        Ubah akun
      </DropdownMenuItem>
      {akun.status === "MENUNGGU_AKTIVASI" && (
        <DropdownMenuItem className={ITEM} onSelect={() => buka("undang", akun)}>
          <Send aria-hidden />
          Kirim ulang undangan
        </DropdownMenuItem>
      )}
      {akun.status === "AKTIF" && (
        <>
          <DropdownMenuItem className={ITEM} onSelect={() => buka("reset", akun)}>
            <KeyRound aria-hidden />
            Kirim tautan atur ulang sandi
          </DropdownMenuItem>
          <DropdownMenuItem className={ITEM} onSelect={() => buka("sesi", akun)}>
            <MonitorX aria-hidden />
            Keluarkan dari semua perangkat
          </DropdownMenuItem>
        </>
      )}
      {akun.status === "NONAKTIF" && (
        <DropdownMenuItem className={ITEM} onSelect={() => buka("pulihkan", akun)}>
          <RotateCcw aria-hidden />
          Aktifkan kembali
        </DropdownMenuItem>
      )}
      {!diriSendiri && (akun.status !== "NONAKTIF" || akun.bisaDihapus) && (
        <>
          <DropdownMenuSeparator />
          {akun.status !== "NONAKTIF" && (
            <DropdownMenuItem className={ITEM} variant="destructive" onSelect={() => buka("nonaktifkan", akun)}>
              <PowerOff aria-hidden />
              Nonaktifkan akun
            </DropdownMenuItem>
          )}
          {akun.bisaDihapus && (
            <DropdownMenuItem className={ITEM} variant="destructive" onSelect={() => buka("hapus", akun)}>
              <Trash2 aria-hidden />
              Hapus akun
            </DropdownMenuItem>
          )}
        </>
      )}
    </>
  );
}
