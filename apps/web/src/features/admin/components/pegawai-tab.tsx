// =============================================================================
// TAB PENGELOLAAN MASTER DATA PEGAWAI
// =============================================================================
// Gunanya: mengelola data pegawai ASN dan non-ASN: nama, NIP, bidang, dan status.
// Akun login (undangan, nonaktif, hapus) dikelola di halaman Manajemen akun.
//
// Isi berkas:
//   - PegawaiDialog : modal formulir tambah pegawai atau pengubahan data
//   - PegawaiTab : tabel data pegawai dengan filter, aksi Ubah, dan paginasi
//
// Catatan penting:
//   - Hanya pegawai yang sudah punya akun yang tampil; yang belum ada di Manajemen akun > Perlu diundang.
//   - NIP opsional untuk pegawai non-ASN atau tenaga honorer.
//   - Nomor telepon diambil dari kontak akun pegawai dan hanya ditampilkan di sini.
//   - Validasi satu pintu di server memastikan NIP tidak bentrok sebelum simpan.
//
// Dipakai oleh: master-view.tsx
// =============================================================================

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, SearchX, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
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

import { formatTelp } from "@/lib/format";
import { LABEL_ROLE, type Role } from "@/types/auth";

const ROLES = ["PEGAWAI", "PIMPINAN", "ADMIN"] as const satisfies readonly Role[];

import { zNip } from "@/lib/nip";
import { cn } from "@/lib/utils";
import { UKURAN_HALAMAN_ADMIN } from "../api/admin";
import { usePegawaiAdmin, useSimpanPegawai, useBidangAdmin } from "../hooks/use-admin";
import type { FilterPegawai, PegawaiAdmin, BidangAdmin } from "../types";
import { BadgeAktif, KartuMaster, KolomCari, PilihUnit, TombolUbah, terapkanGalatServer } from "./admin-shared";

const SEMUA = "semua";

const schema = z.object({
  nip: z.union([z.literal(""), zNip()]),
  nama: z.string().trim().min(1, "Nama wajib diisi").max(150, "Nama maksimal 150 karakter"),
  bidangId: z.string().min(1, "Bidang wajib dipilih"),
  kontak: z
    .string()
    .trim()
    .max(50, "Nomor telepon maksimal 50 karakter")
    .regex(/^[0-9+()\-\s]*$/, "Nomor telepon hanya angka, spasi, +, -, atau tanda kurung"),
  status: z.enum(["aktif", "nonaktif"]),
  role: z.enum(ROLES),
});
type Nilai = z.infer<typeof schema>;

// Pegawai yang belum punya akun juga bisa diberi role bawaan; role itu dipakai saat pegawai diundang
export function PegawaiDialog({ pegawai, unit, onClose }: { pegawai: PegawaiAdmin | "baru"; unit: BidangAdmin[]; onClose: () => void }) {
  const simpan = useSimpanPegawai();
  const router = useRouter();
  const [galat, setGalat] = useState<string | null>(null);
  const awal = pegawai === "baru" ? null : pegawai;
  const { register, control, handleSubmit, setError, formState } = useForm<Nilai>({
    resolver: zodResolver(schema),
    defaultValues: {
      nip: awal?.nip ?? "",
      nama: awal?.nama ?? "",
      kontak: awal?.kontak ?? "",
      role: awal?.roleUndangan ?? "PEGAWAI",
      bidangId: awal ? String(awal.bidang.id) : "",
      status: awal && !awal.aktif ? "nonaktif" : "aktif",
    },
  });

  const kirim = handleSubmit((v) => {
    setGalat(null);
    simpan.mutate(
      {
        id: awal?.id,
        isi: {
          nip: v.nip || null,
          nama: v.nama,
          bidangId: Number(v.bidangId),
          aktif: awal ? v.status === "aktif" : undefined,
          kontak: awal?.akun ? v.kontak || null : undefined,
          roleUndangan: awal && !awal.akun ? v.role : undefined,
        },
      },
      {
        onSuccess: () => {
          if (awal) toast.success("Data pegawai diperbarui");
          // Pegawai baru belum punya akun, jadi tampil di Manajemen akun > Perlu diundang, bukan di daftar ini
          else {
            toast.success("Pegawai ditambahkan", { description: "Undang dari tab Perlu diundang." });
            router.push("/admin/akun?tab=belum");
          }
          onClose();
        },
        onError: (e) =>
          setGalat(terapkanGalatServer(e, setError, { nip: "nip", nama: "nama", bidangId: "bidangId", kontak: "kontak" }) || null),
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
      submitLabel={awal ? "Simpan perubahan" : "Tambah pegawai"}
      galat={galat}
    >
      <Field data-invalid={!!formState.errors.nama}>
        <FieldLabel htmlFor="pegawai-nama">
          Nama lengkap <Wajib />
        </FieldLabel>
        <Input id="pegawai-nama" maxLength={150} className="h-10" aria-invalid={!!formState.errors.nama} {...register("nama")} />
        <FieldError errors={[formState.errors.nama]} />
      </Field>
      <div className={cn("grid gap-4", awal && "sm:grid-cols-2")}>
        <Field data-invalid={!!formState.errors.nip}>
          <FieldLabel htmlFor="pegawai-nip">
            NIP
          </FieldLabel>
          <Input id="pegawai-nip" placeholder="Opsional, 18 digit" inputMode="numeric" maxLength={18} className="h-10 tabular-nums" aria-invalid={!!formState.errors.nip} {...register("nip")} />
          <FieldError errors={[formState.errors.nip]} />
        </Field>
        {awal && (
          // Nomor telepon tersimpan di akun, jadi baru bisa diisi setelah pegawai diundang
          <Field data-invalid={!!formState.errors.kontak} data-disabled={!awal.akun || undefined}>
            <FieldLabel htmlFor="pegawai-kontak">
              No. telp
            </FieldLabel>
            <Input
              id="pegawai-kontak"
              type="tel"
              inputMode="tel"
              maxLength={50}
              className="h-10 tabular-nums"
              placeholder="Opsional"
              disabled={!awal.akun}
              aria-invalid={!!formState.errors.kontak}
              {...register("kontak")}
            />
            <FieldError errors={[formState.errors.kontak]} />
          </Field>
        )}
      </div>
      <Field data-invalid={!!formState.errors.bidangId}>
        <FieldLabel htmlFor="pegawai-unit">
          Bidang <Wajib />
        </FieldLabel>
        <Controller
          control={control}
          name="bidangId"
          render={({ field }) => (
            <PilihUnit id="pegawai-unit" unit={unit} value={field.value} onChange={field.onChange} invalid={!!formState.errors.bidangId} />
          )}
        />
        <FieldError errors={[formState.errors.bidangId]} />
      </Field>
      {awal && !awal.akun && (
        <Field>
          <FieldLabel htmlFor="pegawai-role">Role</FieldLabel>
          <Controller
            control={control}
            name="role"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="pegawai-role" className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {LABEL_ROLE[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldDescription>Dipakai saat pegawai ini diundang.</FieldDescription>
        </Field>
      )}
      {awal && (
        <Field>
          <FieldLabel htmlFor="pegawai-status">Status</FieldLabel>
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="pegawai-status" className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aktif">Aktif</SelectItem>
                  <SelectItem value="nonaktif">Nonaktif</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          <FieldDescription>Pegawai nonaktif tidak bisa dipilih untuk kegiatan baru.</FieldDescription>
        </Field>
      )}
    </FormDialog>
  );
}

// Master data hanya menampilkan pegawai yang sudah punya akun; yang belum ada di Manajemen akun > Perlu diundang
const FILTER_AWAL: FilterPegawai = { q: "", unit: null, aktif: null, akun: "ada", page: 1 };

export function PegawaiTab() {
  const [filter, setFilterState] = useState<FilterPegawai>(FILTER_AWAL);
  const setFilter = useCallback((ubah: Partial<FilterPegawai>) => setFilterState((f) => ({ ...f, page: 1, ...ubah })), []);
  const daftar = usePegawaiAdmin(filter);
  const unit = useBidangAdmin();
  const [dialog, setDialog] = useState<PegawaiAdmin | "baru" | null>(null);
  const adaFilter = filter.q !== "" || filter.unit !== null || filter.aktif !== null;

  const kolom = useMemo<DataTableColumn<PegawaiAdmin>[]>(
    () => [
      {
        id: "nama",
        header: "Pegawai",
        cell: ({ row }) => <span className={cn("block max-w-64 min-w-40 font-semibold whitespace-normal", !row.original.aktif && "text-muted-foreground")}>{row.original.nama}</span>,
      },
      { id: "unit", header: "Bidang", cell: ({ row }) => <UnitChip className="max-w-72 whitespace-normal">{row.original.bidang.nama}</UnitChip> },
      {
        id: "kontak",
        header: "No. telp",
        cell: ({ row }) => <span className="text-sm whitespace-nowrap tabular-nums">{row.original.kontak ? formatTelp(row.original.kontak) : <span className="text-muted-foreground">-</span>}</span>,
      },
      {
        id: "nip",
        header: "NIP",
        cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.nip ?? <span className="text-muted-foreground">-</span>}</span>,
      },
      { id: "status", header: "Status", cell: ({ row }) => <BadgeAktif aktif={row.original.aktif} /> },
      {
        id: "aksi",
        header: () => <span className="block text-right">Aksi</span>,
        cell: ({ row }) => <TombolUbah nama={row.original.nama} onClick={() => setDialog(row.original)} />,
      },
    ],
    [],
  );

  return (
    <>
      <div className="grid gap-3 px-4 py-3 sm:grid-cols-2 lg:grid-cols-[minmax(12rem,1fr)_14rem_10rem_auto] md:px-5">
        <KolomCari value={filter.q} onChange={(q) => setFilter({ q })} placeholder="Nama atau NIP..." label="Cari pegawai" />
        <Select value={filter.unit ?? SEMUA} onValueChange={(v) => setFilter({ unit: v === SEMUA ? null : v })}>
          <SelectTrigger className="h-10 w-full" aria-label="Filter bidang">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SEMUA}>Semua bidang</SelectItem>
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
        <Button className="h-10 pointer-coarse:min-h-11" onClick={() => setDialog("baru")} disabled={!unit.data}>
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
            renderMobileCard={(p) => (
              <KartuMaster
                judul={
                  <span className={cn(!p.aktif && "text-muted-foreground")}>{p.nama}</span>
                }
                aksi={<TombolUbah nama={p.nama} onClick={() => setDialog(p)} />}
              >
                <UnitChip className="max-w-full self-start whitespace-normal">{p.bidang.nama}</UnitChip>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground tabular-nums">
                  <span>NIP {p.nip ?? "-"}</span>
                  <span>Telp {p.kontak ? formatTelp(p.kontak) : "-"}</span>
                  <BadgeAktif aktif={p.aktif} />
                </div>
              </KartuMaster>
            )}
            className={cn("transition-opacity duration-150", daftar.isPlaceholderData && "opacity-60")}
            empty={
              adaFilter
                ? {
                    icon: SearchX,
                    title: "Tidak ada pegawai yang cocok.",
                    action: (
                      <Button variant="outline" className="h-10 pointer-coarse:min-h-11" onClick={() => setFilterState(FILTER_AWAL)}>
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

      {dialog && unit.data && <PegawaiDialog pegawai={dialog} unit={unit.data} onClose={() => setDialog(null)} />}
    </>
  );
}
