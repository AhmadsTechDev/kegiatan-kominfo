// =============================================================================
// TAB PENGELOLAAN MASTER DATA PEGAWAI
// =============================================================================
// Gunanya: menyediakan antarmuka lengkap pengelolaan master pegawai ASN dan
// non-ASN, filter unit kerja, impor Excel, serta pengiriman undangan akun.
//
// Isi berkas:
//   - SelAkun : penampil status akun pegawai (aktif, menunggu aktivasi, atau undang)
//   - PegawaiDialog : modal formulir tambah pegawai baru atau pengubahan profil
//   - PegawaiTab : panel utama tabel data pegawai dengan filter, aksi, dan paginasi
//
// Cara kerja:
//   1. Mengambil data pegawai berpaginasi berdasarkan kata kunci NIP/nama dan unit kerja.
//   2. Pegawai baru dapat langsung dibuatkan akun dan dikirimi surel aktivasi mandiri.
//   3. Mendukung impor massal dari Excel serta pengiriman ulang tautan aktivasi akun.
//   4. Admin dapat memperbarui unit kerja atau menonaktifkan status pegawai.
//
// Catatan penting:
//   - Kolom NIP bersifat opsional untuk mendukung pegawai non-ASN atau tenaga honorer.
//   - Validasi satu pintu di server memastikan NIP dan surel tidak bentrok sebelum simpan.
//   - Pegawai yang berstatus nonaktif tidak dapat dikirimi tautan pembuatan akun.
//
// Dipakai oleh: master-view.tsx
// =============================================================================

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Clock, FileSpreadsheet, Plus, SearchX, Send, Users } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { FormDialog, Wajib } from "@/components/shared/form-dialog";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { PanelFooter } from "@/components/shared/panel";
import { UnitChip } from "@/components/shared/unit-chip";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { zNip } from "@/lib/nip";
import { cn } from "@/lib/utils";
import { UKURAN_HALAMAN_ADMIN } from "../api/admin";
import { usePegawaiAdmin, useSimpanPegawai, useUndangPegawai, useUnitKerjaAdmin } from "../hooks/use-admin";
import type { FilterPegawai, PegawaiAdmin, UnitKerjaAdmin } from "../types";
import { AksiBaris, BadgeAktif, KolomCari, PilihUnit, terapkanGalatServer } from "./admin-shared";
import { ImporPegawaiDialog } from "./impor-pegawai-dialog";
import { UndangDialog } from "./undang-dialog";

const SEMUA = "semua";

const schema = z.object({
  nip: z.union([z.literal(""), zNip()]),
  nama: z.string().trim().min(1, "Nama wajib diisi").max(150, "Nama maksimal 150 karakter"),
  unitKerjaId: z.string().min(1, "Unit kerja wajib dipilih"),
  email: z.union([z.literal(""), z.email("Email tidak valid").max(255)]),
  role: z.enum(["PEGAWAI", "PIMPINAN"]),
});
type Nilai = z.infer<typeof schema>;

function SelAkun({ p, onUndang }: { p: PegawaiAdmin; onUndang: (p: PegawaiAdmin) => void }) {
  if (p.akun?.aktif) {
    return (
      <span className="flex max-w-56 flex-col gap-0.5">
        <span className="truncate text-sm">{p.akun.email}</span>
        <span className="inline-flex items-center gap-1 text-xs text-status-selesai-foreground">
          <span aria-hidden className="size-1.5 rounded-full bg-status-selesai-foreground" />
          Akun aktif
        </span>
      </span>
    );
  }
  if (p.akun) {
    return (
      <span className="flex max-w-60 flex-col items-start gap-1">
        <span className="truncate text-sm">{p.akun.email}</span>
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-md bg-status-berlangsung px-1.5 py-0.5 text-[11px] font-semibold text-status-berlangsung-foreground">
            <Clock aria-hidden className="size-3" />
            Menunggu aktivasi
          </span>
          <button
            type="button"
            onClick={() => onUndang(p)}
            className="rounded text-xs font-semibold text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Kirim ulang
          </button>
        </span>
      </span>
    );
  }
  if (!p.aktif) return <span className="text-xs text-muted-foreground">Pegawai nonaktif</span>;
  return (
    <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => onUndang(p)}>
      <Send aria-hidden className="size-3.5" />
      Undang
    </Button>
  );
}

function PegawaiDialog({ pegawai, unit, onClose }: { pegawai: PegawaiAdmin | "baru"; unit: UnitKerjaAdmin[]; onClose: () => void }) {
  const simpan = useSimpanPegawai();
  const [galat, setGalat] = useState<string | null>(null);
  const awal = pegawai === "baru" ? null : pegawai;
  const { register, control, handleSubmit, setError, formState } = useForm<Nilai>({
    resolver: zodResolver(schema),
    defaultValues: {
      nip: awal?.nip ?? "",
      nama: awal?.nama ?? "",
      unitKerjaId: awal ? String(awal.unitKerja.id) : "",
      email: "",
      role: "PEGAWAI",
    },
  });
  const email = useWatch({ control, name: "email" });

  const kirim = handleSubmit((v) => {
    setGalat(null);
    const alamat = v.email.trim().toLowerCase();
    simpan.mutate(
      {
        id: awal?.id,
        isi: {
          nip: v.nip || null,
          nama: v.nama,
          jabatan: awal?.jabatan ?? null,
          unitKerjaId: Number(v.unitKerjaId),
          aktif: awal?.aktif,
          ...(awal ? {} : { email: alamat || null, role: v.role }),
        },
      },
      {
        onSuccess: ({ undangan }) => {
          if (awal) toast.success("Data pegawai diperbarui");
          else if (!undangan) toast.success("Pegawai ditambahkan");
          else if (!undangan.galat) toast.success(`Pegawai ditambahkan dan undangan akun dikirim ke ${undangan.email}`);
          else
            toast.warning("Pegawai ditambahkan, tetapi email undangan gagal dikirim", {
              description: `${undangan.galat}. Kirim ulang lewat tombol Undang di daftar pegawai.`,
            });
          onClose();
        },
        onError: (e) =>
          setGalat(terapkanGalatServer(e, setError, { nip: "nip", nama: "nama", unitKerjaId: "unitKerjaId", email: "email" }) || null),
      },
    );
  });

  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title={awal ? `Ubah data ${awal.nama}` : "Tambah pegawai"}
      onSubmit={kirim}
      pending={simpan.isPending}
      submitLabel={awal ? "Simpan perubahan" : email.trim() ? "Tambah dan kirim undangan" : "Tambah pegawai"}
      galat={galat}
    >
      <Field data-invalid={!!formState.errors.nama}>
        <FieldLabel htmlFor="pegawai-nama">
          Nama lengkap <Wajib />
        </FieldLabel>
        <Input id="pegawai-nama" maxLength={150} className="h-10" autoFocus aria-invalid={!!formState.errors.nama} {...register("nama")} />
        <FieldError errors={[formState.errors.nama]} />
      </Field>
      <div className="grid gap-4">
        <Field data-invalid={!!formState.errors.nip}>
          <FieldLabel htmlFor="pegawai-nip">
            NIP <span className="font-normal text-muted-foreground">(opsional)</span>
          </FieldLabel>
          <Input id="pegawai-nip" inputMode="numeric" maxLength={18} className="h-10 tabular-nums" aria-invalid={!!formState.errors.nip} {...register("nip")} />
          <FieldError errors={[formState.errors.nip]} />
        </Field>
      </div>
      <Field data-invalid={!!formState.errors.unitKerjaId}>
        <FieldLabel htmlFor="pegawai-unit">
          Unit kerja <Wajib />
        </FieldLabel>
        <Controller
          control={control}
          name="unitKerjaId"
          render={({ field }) => (
            <PilihUnit id="pegawai-unit" unit={unit} value={field.value} onChange={field.onChange} invalid={!!formState.errors.unitKerjaId} />
          )}
        />
        <FieldError errors={[formState.errors.unitKerjaId]} />
      </Field>
      {!awal && (
        <div className="grid gap-4 rounded-xl border border-dashed p-3 sm:grid-cols-[1fr_9rem]">
          <Field data-invalid={!!formState.errors.email}>
            <FieldLabel htmlFor="pegawai-email">
              Email untuk akun <span className="font-normal text-muted-foreground">(opsional)</span>
            </FieldLabel>
            <Input id="pegawai-email" type="email" autoComplete="off" maxLength={255} className="h-10" aria-invalid={!!formState.errors.email} {...register("email")} />
            <FieldDescription>Bila diisi, pegawai langsung menerima tautan untuk membuat kata sandi.</FieldDescription>
            <FieldError errors={[formState.errors.email]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="pegawai-role">Role</FieldLabel>
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={!email.trim()}>
                  <SelectTrigger id="pegawai-role" className="h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PEGAWAI">Pegawai</SelectItem>
                    <SelectItem value="PIMPINAN">Pimpinan</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        </div>
      )}
    </FormDialog>
  );
}

const FILTER_AWAL: FilterPegawai = { q: "", unit: null, aktif: null, page: 1 };

export function PegawaiTab() {
  const [filter, setFilterState] = useState<FilterPegawai>(FILTER_AWAL);
  const setFilter = useCallback((ubah: Partial<FilterPegawai>) => setFilterState((f) => ({ ...f, page: 1, ...ubah })), []);
  const daftar = usePegawaiAdmin(filter);
  const unit = useUnitKerjaAdmin();
  const simpan = useSimpanPegawai();
  const { mutate } = simpan;
  const [dialog, setDialog] = useState<PegawaiAdmin | "baru" | null>(null);
  const [impor, setImpor] = useState(false);
  const [konfirmasi, setKonfirmasi] = useState<PegawaiAdmin | null>(null);
  const [undang, setUndang] = useState<PegawaiAdmin | null>(null);
  const kirimUndangan = useUndangPegawai();
  const adaFilter = filter.q !== "" || filter.unit !== null || filter.aktif !== null;

  const ubahStatus = useCallback(
    (p: PegawaiAdmin, aktif: boolean) =>
      mutate(
        { id: p.id, isi: { nip: p.nip, nama: p.nama, jabatan: p.jabatan, unitKerjaId: p.unitKerja.id, aktif } },
        {
          onSuccess: () => {
            toast.success(aktif ? `${p.nama} diaktifkan` : `${p.nama} dinonaktifkan`);
            setKonfirmasi(null);
          },
          onError: (e) => toast.error(e.message),
        },
      ),
    [mutate],
  );

  const kolom = useMemo<DataTableColumn<PegawaiAdmin>[]>(
    () => [
      {
        id: "nama",
        header: "Pegawai",
        cell: ({ row }) => (
          <div className="flex max-w-80 min-w-52 flex-col gap-0.5 whitespace-normal">
            <span className={cn("font-semibold", !row.original.aktif && "text-muted-foreground")}>{row.original.nama}</span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {row.original.nip ?? "Tanpa NIP"}
            </span>
          </div>
        ),
      },
      { id: "unit", header: "Unit kerja", cell: ({ row }) => <UnitChip className="max-w-56 whitespace-normal">{row.original.unitKerja.nama}</UnitChip> },
      {
        id: "akun",
        header: "Akun login",
        cell: ({ row }) => <SelAkun p={row.original} onUndang={setUndang} />,
      },
      { id: "status", header: "Status", cell: ({ row }) => <BadgeAktif aktif={row.original.aktif} /> },
      {
        id: "aksi",
        header: () => <span className="block text-right">Aksi</span>,
        cell: ({ row }) => {
          const p = row.original;
          return (
            <AksiBaris nama={p.nama} aktif={p.aktif} onUbah={() => setDialog(p)} onUbahStatus={() => (p.aktif ? setKonfirmasi(p) : ubahStatus(p, true))} />
          );
        },
      },
    ],
    [ubahStatus],
  );

  return (
    <>
      <div className="grid gap-3 px-4 py-3 sm:grid-cols-2 lg:grid-cols-[minmax(12rem,1fr)_14rem_10rem_auto_auto] md:px-5">
        <KolomCari value={filter.q} onChange={(q) => setFilter({ q })} placeholder="Nama atau NIP..." label="Cari pegawai" />
        <Select value={filter.unit ?? SEMUA} onValueChange={(v) => setFilter({ unit: v === SEMUA ? null : v })}>
          <SelectTrigger className="h-10 w-full" aria-label="Filter unit kerja">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SEMUA}>Semua unit kerja</SelectItem>
            {(unit.data ?? []).map((u) => (
              <SelectItem key={u.id} value={String(u.id)} className={cn(u.parentId !== null && "pl-6 text-muted-foreground")}>
                {u.nama}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filter.aktif ?? SEMUA} onValueChange={(v) => setFilter({ aktif: v === SEMUA ? null : (v as "1" | "0") })}>
          <SelectTrigger className="h-10 w-full" aria-label="Filter status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SEMUA}>Semua status</SelectItem>
            <SelectItem value="1">Aktif</SelectItem>
            <SelectItem value="0">Nonaktif</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" className="h-10" onClick={() => setImpor(true)}>
          <FileSpreadsheet aria-hidden />
          Impor Excel
        </Button>
        <Button className="h-10" onClick={() => setDialog("baru")} disabled={!unit.data}>
          <Plus aria-hidden />
          Tambah pegawai
        </Button>
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
            caption="Daftar pegawai"
            getRowKey={(p) => String(p.id)}
            className={cn("transition-opacity duration-150", daftar.isPlaceholderData && "opacity-60")}
            empty={
              adaFilter
                ? {
                    icon: SearchX,
                    title: "Tidak ada pegawai yang cocok.",
                    action: (
                      <Button variant="outline" className="h-10" onClick={() => setFilterState(FILTER_AWAL)}>
                        Atur ulang filter
                      </Button>
                    ),
                  }
                : { icon: Users, title: "Belum ada pegawai." }
            }
          />
          {daftar.data && daftar.data.total > 0 && (
            <PanelFooter>
              <PaginationBar
                className="w-full"
                satuan="pegawai"
                page={daftar.data.page}
                pageSize={UKURAN_HALAMAN_ADMIN}
                total={daftar.data.total}
                onPageChange={(page) => setFilterState((f) => ({ ...f, page }))}
              />
            </PanelFooter>
          )}
        </>
      )}

      {impor && <ImporPegawaiDialog onClose={() => setImpor(false)} />}
      {dialog && unit.data && <PegawaiDialog pegawai={dialog} unit={unit.data} onClose={() => setDialog(null)} />}
      {undang && (
        <UndangDialog
          title={undang.akun ? `Kirim ulang undangan ${undang.nama}` : `Undang ${undang.nama}`}
          penerima={
            <>
              <p className="truncate font-semibold">{undang.nama}</p>
              <p className="truncate text-xs text-muted-foreground">
                {undang.nip ? `NIP ${undang.nip}` : "Tanpa NIP"} · {undang.unitKerja.nama}
              </p>
            </>
          }
          defaultEmail={undang.akun?.email}
          submitLabel={undang.akun ? "Kirim ulang undangan" : "Kirim undangan"}
          pending={kirimUndangan.isPending}
          onClose={() => setUndang(null)}
          onSubmit={(isi, gagal) =>
            kirimUndangan.mutate(
              { pegawaiId: undang.id, isi },
              {
                onSuccess: (h) => {
                  toast.success(`Undangan ${h.kirimUlang ? "dikirim ulang" : "dikirim"} ke ${h.email}`);
                  setUndang(null);
                },
                onError: gagal,
              },
            )
          }
        />
      )}
      {konfirmasi && (
        <ConfirmDialog
          open
          onOpenChange={(v) => !v && setKonfirmasi(null)}
          title={`Nonaktifkan pegawai "${konfirmasi.nama}"?`}
          description="Pegawai ini tidak bisa dipilih lagi untuk kegiatan baru."
          confirmLabel="Nonaktifkan"
          pendingLabel="Menonaktifkan..."
          pending={simpan.isPending}
          onConfirm={() => ubahStatus(konfirmasi, false)}
        />
      )}
    </>
  );
}
