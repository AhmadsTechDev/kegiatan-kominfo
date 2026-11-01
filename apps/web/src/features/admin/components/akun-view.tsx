// =============================================================================
// TAMPILAN MANAJEMEN PENGELOLAAN AKUN PENGGUNA
// =============================================================================
// Gunanya: menyediakan antarmuka manajemen akun pengguna aplikasi, meliputi
// pembuatan akun, perubahan role, reset kata sandi, arsip, dan permintaan akun.
//
// Isi berkas:
//   - PilihRole : komponen pemilih kartu role akun (PEGAWAI, PIMPINAN, ADMIN)
//   - AkunDialog : dialog modal pembuatan akun baru atau pengubahan akun yang ada
//   - ResetSandiDialog : modal dialog admin untuk mereset kata sandi akun pengguna
//   - DaftarAkun : tabel daftar akun berpaginasi dengan filter pencarian dan role
//   - IsiAkun : pengelola navigasi tab (Akun aktif, Permintaan akun, dan Arsip)
//   - AkunView : komponen tampilan utama halaman manajemen akun dengan AdminGuard
//
// Cara kerja:
//   1. Administrator memantau daftar akun aktif, riwayat arsip, atau permohonan baru.
//   2. Form pembuatan akun memvalidasi data via Zod dan mengaitkan profil ke pegawai.
//   3. Aksi baris menyediakan reset sandi, penonaktifan, pemulihan, atau kirim undangan.
//
// Catatan penting:
//   - Memenuhi NFR-01 (kebijakan panjang kata sandi minimal 10 karakter).
//   - Admin dilarang menonaktifkan atau menghapus akun miliknya sendiri.
//   - Penghapusan permanen hanya diizinkan bagi akun yang belum memiliki data kegiatan.
//   - Pegawai tanpa unit kerja diberi penanda khusus karena belum bisa mendata kegiatan.
//
// Dipakai oleh: frontend/src/app/(app)/admin/akun/page.tsx
// =============================================================================

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Archive, Building2, Clock, Ellipsis, KeyRound, Lock, Pencil, Plus, PowerOff, RotateCcw, SearchX, Send, Trash2, UserCog } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { AvatarInisial } from "@/components/shared/avatar-inisial";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { FormDialog, Wajib } from "@/components/shared/form-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { Panel, PanelFooter } from "@/components/shared/panel";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import { useReferensi } from "@/features/kegiatan/hooks/use-kegiatan";

import { cn } from "@/lib/utils";
import { LABEL_ROLE, type Role } from "@/types/auth";
import { UKURAN_HALAMAN_ADMIN } from "../api/admin";
import { useAkunAdmin, useHapusAkun, useJumlahPermintaan, useResetSandi, useSimpanAkun, useStatusAkun, useUndangPegawai } from "../hooks/use-admin";
import type { AkunAdmin, FilterAkun } from "../types";
import { AdminGuard, BadgeAktif, KolomCari, PilihanTab, terapkanGalatServer } from "./admin-shared";
import { HubungkanPegawaiDialog } from "./hubungkan-pegawai-dialog";
import { PermintaanTab } from "./permintaan-tab";
import { UndangDialog } from "./undang-dialog";

const SEMUA = "semua";
const TANPA = "tanpa";
const ROLE: Role[] = ["PEGAWAI", "PIMPINAN", "ADMIN"];
const KETERANGAN_ROLE: Record<Role, string> = {
  PEGAWAI: "Mencatat dan mengubah kegiatan miliknya",
  PIMPINAN: "Melihat seluruh kegiatan, rekap, dan dashboard tanpa mengubah data",
  ADMIN: "Mengelola master data, akun, dan audit log",
};

const sandi = z.string().min(10, "Kata sandi minimal 10 karakter").max(128, "Kata sandi maksimal 128 karakter");

const schemaAkun = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi").max(150, "Nama maksimal 150 karakter"),
  email: z.email("Email tidak valid").max(255),
  role: z.enum(["PEGAWAI", "PIMPINAN", "ADMIN"]),
  pegawaiId: z.string(),
  password: z.string(),
});
type NilaiAkun = z.infer<typeof schemaAkun>;

function PilihRole({ value, onChange }: { value: Role; onChange: (r: Role) => void }) {
  return (
    <div role="radiogroup" aria-label="Role" className="grid gap-2 sm:grid-cols-3">
      {ROLE.map((r) => {
        const aktif = value === r;
        return (
          <button
            key={r}
            type="button"
            role="radio"
            aria-checked={aktif}
            onClick={() => onChange(r)}
            className={cn(
              "flex flex-col gap-0.5 rounded-xl border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
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

function AkunDialog({ akun, onClose }: { akun: AkunAdmin | "baru"; onClose: () => void }) {
  const simpan = useSimpanAkun();
  const referensi = useReferensi();
  const [galat, setGalat] = useState<string | null>(null);
  const awal = akun === "baru" ? null : akun;
  const { register, control, handleSubmit, setError, setValue, getValues, formState } = useForm<NilaiAkun>({
    resolver: zodResolver(schemaAkun),
    defaultValues: {
      name: awal?.name ?? "",
      email: awal?.email ?? "",
      role: awal?.role ?? "PEGAWAI",
      pegawaiId: awal?.pegawaiId ? String(awal.pegawaiId) : TANPA,
      password: "",
    },
  });

  const role = useWatch({ control, name: "role" });
  const pegawaiId = useWatch({ control, name: "pegawaiId" });
  const unitPerId = useMemo(() => new Map((referensi.data?.unitKerja ?? []).map((u) => [u.id, u])), [referensi.data]);
  const pegawai = referensi.data?.pegawai ?? [];
  const terpilih = pegawai.find((p) => String(p.id) === pegawaiId);
  const labelUnit = (unitKerjaId: number) => {
    const u = unitPerId.get(unitKerjaId);
    const induk = u?.parentId ? unitPerId.get(u.parentId) : undefined;
    return [u?.nama, induk?.nama].filter(Boolean).join(" · ");
  };

  const kirim = handleSubmit((v) => {
    setGalat(null);
    if (!awal) {
      const cek = sandi.safeParse(v.password);
      if (!cek.success) return setError("password", { message: cek.error.issues[0]?.message });
    }
    const tertaut = v.pegawaiId !== TANPA;
    simpan.mutate(
      {
        id: awal?.id,
        isi: {
          name: v.name,
          email: v.email,
          nip: tertaut ? null : awal && !awal.pegawaiId ? awal.username : null,
          role: v.role,
          pegawaiId: tertaut ? Number(v.pegawaiId) : null,
        },
        password: awal ? undefined : v.password,
      },
      {
        onSuccess: () => {
          toast.success(awal ? "Akun diperbarui" : "Akun dibuat. Sampaikan kata sandi awal kepada pemiliknya secara langsung.");
          onClose();
        },
        onError: (e) =>
          setGalat(terapkanGalatServer(e, setError, { name: "name", email: "email", role: "role", pegawaiId: "pegawaiId", password: "password" }) || null),
      },
    );
  });

  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title={awal ? `Ubah akun ${awal.name}` : "Buat akun"}
      description="Pengguna masuk dengan email ini. Untuk pegawai, lebih mudah memakai tombol Undang di Master data."
      onSubmit={kirim}
      pending={simpan.isPending}
      submitLabel={awal ? "Simpan perubahan" : "Buat akun"}
      galat={galat}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field data-invalid={!!formState.errors.name}>
          <FieldLabel htmlFor="akun-nama">
            Nama <Wajib />
          </FieldLabel>
          <Input id="akun-nama" maxLength={150} className="h-10" aria-invalid={!!formState.errors.name} {...register("name")} />
          <FieldError errors={[formState.errors.name]} />
        </Field>
        <Field data-invalid={!!formState.errors.email}>
          <FieldLabel htmlFor="akun-email">
            Email <Wajib />
          </FieldLabel>
          <Input id="akun-email" type="email" maxLength={255} className="h-10" aria-invalid={!!formState.errors.email} {...register("email")} />
          <FieldError errors={[formState.errors.email]} />
        </Field>
      </div>

      <Field data-invalid={!!formState.errors.role}>
        <FieldLabel>
          Role <Wajib />
        </FieldLabel>
        <Controller control={control} name="role" render={({ field }) => <PilihRole value={field.value} onChange={field.onChange} />} />
        {awal && role !== awal.role && <FieldDescription>Akun akan dikeluarkan dari semua sesinya setelah role diubah.</FieldDescription>}
        <FieldError errors={[formState.errors.role]} />
      </Field>

      <Field data-invalid={!!formState.errors.pegawaiId} className="min-w-0">
        <FieldLabel htmlFor="akun-pegawai">
          Data pegawai {role !== "PEGAWAI" && <span className="font-normal text-muted-foreground">(opsional)</span>}
        </FieldLabel>
        <Controller
          control={control}
          name="pegawaiId"
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={(v) => {
                field.onChange(v);
                const p = pegawai.find((x) => String(x.id) === v);
                if (p && !getValues("name")) setValue("name", p.nama);
              }}
            >
              <SelectTrigger id="akun-pegawai" className="h-10 w-full min-w-0" aria-invalid={!!formState.errors.pegawaiId}>
                <SelectValue className="min-w-0 overflow-hidden">
                  {terpilih ? (
                    <span className="block min-w-0 truncate">
                      {terpilih.nama}
                      <span className="text-muted-foreground"> · {unitPerId.get(terpilih.unitKerjaId)?.nama}</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Tidak dihubungkan</span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-w-[min(32rem,calc(100vw-2rem))]">
                <SelectItem value={TANPA}>Tidak dihubungkan</SelectItem>
                {pegawai.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-medium">{p.nama}</span>
                      <span className="truncate text-xs text-muted-foreground">{labelUnit(p.unitKerjaId)}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {terpilih ? (
          <FieldDescription>Unit kerja dan NIP login mengikuti data pegawai ini.</FieldDescription>
        ) : role === "PEGAWAI" ? (
          <p className="rounded-lg bg-status-berlangsung px-3 py-2 text-xs text-status-berlangsung-foreground">
            Pegawai belum bisa mencatat kegiatan sebelum dihubungkan ke data pegawai.
          </p>
        ) : (
          <FieldDescription>Pimpinan dan admin boleh tidak dihubungkan.</FieldDescription>
        )}
        <FieldError errors={[formState.errors.pegawaiId]} />
      </Field>

      {!awal && (
        <Field data-invalid={!!formState.errors.password}>
          <FieldLabel htmlFor="akun-sandi">
            Kata sandi awal <Wajib />
          </FieldLabel>
          <Input id="akun-sandi" type="password" autoComplete="new-password" className="h-10" aria-invalid={!!formState.errors.password} {...register("password")} />
          <FieldDescription>Minimal 10 karakter. Minta pemiliknya menggantinya setelah login pertama.</FieldDescription>
          <FieldError errors={[formState.errors.password]} />
        </Field>
      )}
    </FormDialog>
  );
}

function ResetSandiDialog({ akun, onClose }: { akun: AkunAdmin; onClose: () => void }) {
  const reset = useResetSandi();
  const [galat, setGalat] = useState<string | null>(null);
  const { register, handleSubmit, setError, formState } = useForm<{
    password: string;
    ulang: string;
  }>({
    resolver: zodResolver(
      z.object({ password: sandi, ulang: z.string() }).refine((v) => v.password === v.ulang, {
        path: ["ulang"],
        message: "Kata sandi tidak sama",
      }),
    ),
    defaultValues: { password: "", ulang: "" },
  });

  const kirim = handleSubmit((v) => {
    setGalat(null);
    reset.mutate(
      { id: akun.id, password: v.password },
      {
        onSuccess: () => {
          toast.success(`Kata sandi ${akun.name} diganti. Semua sesinya telah dikeluarkan.`);
          onClose();
        },
        onError: (e) => setGalat(terapkanGalatServer(e, setError, { password: "password" }) || null),
      },
    );
  });

  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title={`Atur ulang kata sandi ${akun.name}`}
      description="Sesi aktif akun ini akan dikeluarkan dan penguncian karena salah sandi dibuka."
      onSubmit={kirim}
      pending={reset.isPending}
      submitLabel="Simpan kata sandi"
      galat={galat}
    >
      <Field data-invalid={!!formState.errors.password}>
        <FieldLabel htmlFor="reset-sandi">
          Kata sandi baru <Wajib />
        </FieldLabel>
        <Input
          id="reset-sandi"
          type="password"
          autoComplete="new-password"
          className="h-10"
          aria-invalid={!!formState.errors.password}
          autoFocus
          {...register("password")}
        />
        <FieldError errors={[formState.errors.password]} />
      </Field>
      <Field data-invalid={!!formState.errors.ulang}>
        <FieldLabel htmlFor="reset-ulang">
          Ulangi kata sandi <Wajib />
        </FieldLabel>
        <Input
          id="reset-ulang"
          type="password"
          autoComplete="new-password"
          className="h-10"
          aria-invalid={!!formState.errors.ulang}
          {...register("ulang")}
        />
        <FieldError errors={[formState.errors.ulang]} />
      </Field>
    </FormDialog>
  );
}

type Aksi = {
  akun: AkunAdmin;
  jenis: "ubah" | "reset" | "nonaktifkan" | "hapus" | "undang" | "hubungkan";
} | null;
const filterAwal = (arsip: boolean): FilterAkun => ({ q: "", role: null, aktif: arsip ? "0" : "1", page: 1 });

function DaftarAkun({ arsip }: { arsip: boolean }) {
  const { user } = useCurrentUser();
  const [filter, setFilterState] = useState<FilterAkun>(() => filterAwal(arsip));
  const setFilter = useCallback((ubah: Partial<FilterAkun>) => setFilterState((f) => ({ ...f, page: 1, ...ubah })), []);
  const daftar = useAkunAdmin(filter);
  const status = useStatusAkun();
  const { mutate: ubahStatus } = status;
  const [baru, setBaru] = useState(false);
  const [aksi, setAksi] = useState<Aksi>(null);
  const undang = useUndangPegawai();
  const hapus = useHapusAkun();
  const [alasan, setAlasan] = useState("");
  const adaFilter = filter.q !== "" || filter.role !== null;
  const idSaya = user?.id;

  const aktifkan = useCallback(
    (a: AkunAdmin) =>
      ubahStatus(
        { id: a.id, aktif: true },
        {
          onSuccess: () => toast.success(`Akun ${a.name} dipulihkan dan bisa login lagi`),
          onError: (e) => toast.error(e.message),
        },
      ),
    [ubahStatus],
  );

  const kolom = useMemo<DataTableColumn<AkunAdmin>[]>(
    () => [
      {
        id: "nama",
        header: "Akun",
        cell: ({ row }) => {
          const a = row.original;
          return (
            <span className="flex max-w-80 min-w-56 items-center gap-2.5 whitespace-normal">
              <AvatarInisial nama={a.name} src={a.foto} className="size-8" />
              <span className="flex min-w-0 flex-col">
                <span className="font-semibold">
                  {a.name}
                  {a.id === idSaya && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(Anda)</span>}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {a.email}
                  {a.username && ` · NIP ${a.username}`}
                </span>
              </span>
            </span>
          );
        },
      },
      {
        id: "role",
        header: "Role",
        cell: ({ row }) => (
          <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold text-primary">{LABEL_ROLE[row.original.role]}</span>
        ),
      },
      {
        id: "unit",
        header: "Unit kerja",
        cell: ({ row }) => {
          const a = row.original;
          const p = a.pegawai;
          if (p) {
            return (
              <span className="flex max-w-64 min-w-44 flex-col gap-0.5 whitespace-normal">
                <span className="text-sm font-medium">{p.unitKerja}</span>
                {p.unitInduk && <span className="text-xs text-muted-foreground">di bawah {p.unitInduk}</span>}
                <span className="text-xs text-muted-foreground">{p.nip ? `NIP ${p.nip}` : "Tanpa NIP"}</span>
              </span>
            );
          }
          return (
            <span className="flex flex-col items-start gap-1">
              <span className={cn("text-xs", a.role === "PEGAWAI" ? "font-semibold text-status-berlangsung-foreground" : "text-muted-foreground")}>
                {a.role === "PEGAWAI" ? "Belum punya unit kerja" : "Tidak terikat unit"}
              </span>
              {a.role === "PEGAWAI" && !arsip && (
                <button
                  type="button"
                  onClick={() => setAksi({ akun: a, jenis: "hubungkan" })}
                  className="rounded text-xs font-semibold text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  Atur unit kerja
                </button>
              )}
            </span>
          );
        },
      },
      {
        id: "status",
        header: arsip ? "Alasan" : "Status",
        cell: ({ row }) =>
          arsip ? (
            <span className="block max-w-56 min-w-32 text-xs whitespace-normal text-muted-foreground">
              {row.original.banReason && row.original.banReason !== "Dinonaktifkan admin" ? row.original.banReason : "Tanpa keterangan"}
            </span>
          ) : (
          <span className="flex flex-col items-start gap-1">
            {row.original.menungguAktivasi && !row.original.banned ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-status-berlangsung px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-status-berlangsung-foreground">
                <Clock aria-hidden className="size-3" />
                Menunggu aktivasi
              </span>
            ) : (
              <BadgeAktif aktif={!row.original.banned} />
            )}
            {row.original.terkunci && (
              <span className="inline-flex items-center gap-1 text-xs text-status-berlangsung-foreground">
                <Lock aria-hidden className="size-3" />
                Terkunci sementara
              </span>
            )}
          </span>
        ),
      },
      {
        id: "aksi",
        header: () => <span className="block text-right">Aksi</span>,
        cell: ({ row }) => {
          const a = row.original;
          const diriSendiri = a.id === idSaya;
          if (arsip) {
            return (
              <div className="flex justify-end gap-1">
                <Button variant="outline" size="sm" className="h-9" onClick={() => aktifkan(a)}>
                  <RotateCcw aria-hidden />
                  Pulihkan
                </Button>
                {a.bisaDihapus && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-9 text-muted-foreground hover:text-destructive"
                    aria-label={`Hapus ${a.name}`}
                    onClick={() => setAksi({ akun: a, jenis: "hapus" })}
                  >
                    <Trash2 />
                  </Button>
                )}
              </div>
            );
          }
          return (
            <div className="flex justify-end gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="size-9 text-muted-foreground"
                aria-label={`Ubah ${a.name}`}
                onClick={() => setAksi({ akun: a, jenis: "ubah" })}
              >
                <Pencil />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-9 text-muted-foreground" aria-label={`Aksi lain untuk ${a.name}`}>
                    <Ellipsis />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {a.menungguAktivasi && a.pegawaiId && (
                    <DropdownMenuItem onSelect={() => setAksi({ akun: a, jenis: "undang" })}>
                      <Send aria-hidden />
                      Kirim ulang undangan
                    </DropdownMenuItem>
                  )}
                  {!a.pegawaiId && (
                    <DropdownMenuItem onSelect={() => setAksi({ akun: a, jenis: "hubungkan" })}>
                      <Building2 aria-hidden />
                      Atur unit kerja
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onSelect={() => setAksi({ akun: a, jenis: "reset" })}>
                    <KeyRound aria-hidden />
                    Atur ulang kata sandi
                  </DropdownMenuItem>
                  {!diriSendiri && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onSelect={() => setAksi({ akun: a, jenis: "nonaktifkan" })}>
                        <PowerOff aria-hidden />
                        Nonaktifkan akun
                      </DropdownMenuItem>
                      {a.bisaDihapus && (
                        <DropdownMenuItem variant="destructive" onSelect={() => setAksi({ akun: a, jenis: "hapus" })}>
                          <Trash2 aria-hidden />
                          Hapus akun
                        </DropdownMenuItem>
                      )}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [aktifkan, arsip, idSaya],
  );

  const tutupAksi = () => {
    setAksi(null);
    setAlasan("");
  };

  return (
    <>
      <div className={cn("grid gap-3 p-4 md:p-5", arsip ? "sm:grid-cols-[minmax(12rem,1fr)_10rem]" : "sm:grid-cols-[minmax(12rem,1fr)_10rem_auto]")}>
        <KolomCari value={filter.q} onChange={(q) => setFilter({ q })} placeholder="Nama, email, atau NIP..." label="Cari akun" />
        <Select value={filter.role ?? SEMUA} onValueChange={(v) => setFilter({ role: v === SEMUA ? null : (v as Role) })}>
          <SelectTrigger className="h-10 w-full" aria-label="Filter role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SEMUA}>Semua role</SelectItem>
            {ROLE.map((r) => (
              <SelectItem key={r} value={r}>
                {LABEL_ROLE[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!arsip && (
          <Button className="h-10" onClick={() => setBaru(true)}>
            <Plus aria-hidden />
            Buat akun
          </Button>
        )}
      </div>

      {daftar.isError ? (
        <div className="px-4 pb-4 md:px-5">
          <ErrorState message={daftar.error.message} onRetry={() => daftar.refetch()} retrying={daftar.isRefetching} />
        </div>
      ) : (
        <>
          <DataTable
            columns={kolom}
            data={daftar.data?.items ?? []}
            isLoading={daftar.isPending}
            bleed
            caption={arsip ? "Arsip akun nonaktif" : "Daftar akun"}
            getRowKey={(a) => a.id}
            className={cn("transition-opacity duration-150", daftar.isPlaceholderData && "opacity-60")}
            empty={
              adaFilter
                ? {
                    icon: SearchX,
                    title: "Tidak ada akun yang cocok.",
                    action: (
                      <Button variant="outline" className="h-10" onClick={() => setFilterState(filterAwal(arsip))}>
                        Atur ulang filter
                      </Button>
                    ),
                  }
                : arsip
                  ? { icon: Archive, title: "Arsip kosong. Akun yang dinonaktifkan akan muncul di sini." }
                  : { icon: UserCog, title: "Belum ada akun." }
            }
          />
          {daftar.data && daftar.data.total > 0 && (
            <PanelFooter>
              <PaginationBar
                className="w-full"
                satuan="akun"
                page={daftar.data.page}
                pageSize={UKURAN_HALAMAN_ADMIN}
                total={daftar.data.total}
                onPageChange={(page) => setFilterState((f) => ({ ...f, page }))}
              />
            </PanelFooter>
          )}
        </>
      )}

      {baru && <AkunDialog akun="baru" onClose={() => setBaru(false)} />}
      {aksi?.jenis === "ubah" && <AkunDialog akun={aksi.akun} onClose={tutupAksi} />}
      {aksi?.jenis === "reset" && <ResetSandiDialog akun={aksi.akun} onClose={tutupAksi} />}
      {aksi?.jenis === "hubungkan" && <HubungkanPegawaiDialog akun={aksi.akun} onClose={tutupAksi} />}
      {aksi?.jenis === "undang" && aksi.akun.pegawaiId && (
        <UndangDialog
          title={`Kirim ulang undangan ${aksi.akun.name}`}
          penerima={
            <>
              <p className="truncate font-semibold">{aksi.akun.name}</p>
              <p className="truncate text-xs text-muted-foreground">{aksi.akun.pegawai?.unitKerja ?? "Akun belum diaktivasi"}</p>
            </>
          }
          defaultEmail={aksi.akun.email}
          defaultRole={aksi.akun.role}
          submitLabel="Kirim ulang undangan"
          pending={undang.isPending}
          onClose={tutupAksi}
          onSubmit={(isi, gagal) =>
            undang.mutate(
              { pegawaiId: aksi.akun.pegawaiId!, isi },
              {
                onSuccess: (h) => {
                  toast.success(`Undangan dikirim ulang ke ${h.email}. Tautan lama tidak berlaku lagi.`);
                  tutupAksi();
                },
                onError: gagal,
              },
            )
          }
        />
      )}
      {aksi?.jenis === "hapus" && (
        <ConfirmDialog
          open
          onOpenChange={(v) => !v && tutupAksi()}
          title={`Hapus akun ${aksi.akun.name}?`}
          description="Akun ini belum pernah dipakai dan akan dihapus permanen."
          confirmLabel="Hapus akun"
          pendingLabel="Menghapus..."
          pending={hapus.isPending}
          onConfirm={() =>
            hapus.mutate(aksi.akun.id, {
              onSuccess: () => {
                toast.success(`Akun ${aksi.akun.name} dihapus`);
                tutupAksi();
              },
              onError: (e) => toast.error(e.message),
            })
          }
        />
      )}
      {aksi?.jenis === "nonaktifkan" && (
        <ConfirmDialog
          open
          onOpenChange={(v) => !v && tutupAksi()}
          title={`Nonaktifkan akun ${aksi.akun.name}?`}
          description="Akun tidak bisa login dan dipindah ke Arsip. Bisa dipulihkan kapan saja."
          confirmLabel="Nonaktifkan akun"
          pendingLabel="Menonaktifkan..."
          pending={status.isPending}
          onConfirm={() =>
            ubahStatus(
              { id: aksi.akun.id, aktif: false, alasan: alasan.trim() },
              {
                onSuccess: () => {
                  toast.success(`Akun ${aksi.akun.name} dipindah ke Arsip`);
                  tutupAksi();
                },
                onError: (e) => toast.error(e.message),
              },
            )
          }
        >
          <Field>
            <FieldLabel htmlFor="alasan-nonaktif">Alasan (opsional)</FieldLabel>
            <Input
              id="alasan-nonaktif"
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              maxLength={255}
              className="h-10"
              placeholder="Contoh: pindah tugas"
            />
          </Field>
        </ConfirmDialog>
      )}
    </>
  );
}

type TabAkun = "akun" | "permintaan" | "arsip";

function IsiAkun() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const dariUrl = searchParams.get("tab");
  const tab: TabAkun = dariUrl === "permintaan" || dariUrl === "arsip" ? dariUrl : "akun";
  const jumlah = useJumlahPermintaan();
  const menunggu = jumlah.data?.menunggu ?? 0;
  const arsip = useAkunAdmin(filterAwal(true));
  const jumlahArsip = arsip.data?.total ?? 0;

  return (
    <Panel>
      <div className="border-b border-muted px-4 pt-4 pb-3 md:px-5">
        <PilihanTab
          label="Bagian manajemen akun"
          value={tab}
          onChange={(t) =>
            router.replace(t === "akun" ? pathname : `${pathname}?tab=${t}`, {
              scroll: false,
            })
          }
          opsi={[
            { nilai: "akun", label: "Akun" },
            {
              nilai: "permintaan",
              label: menunggu > 0 ? `Permintaan akun (${menunggu})` : "Permintaan akun",
            },
            { nilai: "arsip", label: jumlahArsip > 0 ? `Arsip (${jumlahArsip})` : "Arsip" },
          ]}
        />
      </div>
      {tab === "permintaan" ? <PermintaanTab /> : <DaftarAkun key={tab} arsip={tab === "arsip"} />}
    </Panel>
  );
}

export function AkunView() {
  return (
    <>
      <PageHeader eyebrow="Administrasi" title="Manajemen akun" description="Kelola akun login, role, dan unit kerja setiap pengguna." />
      <AdminGuard>
        <IsiAkun />
      </AdminGuard>
    </>
  );
}
