// =============================================================================
// TAB PENGELOLAAN MASTER DATA PEGAWAI
// =============================================================================
// Gunanya: mengelola data pegawai ASN dan non-ASN: nama, NIP, jabatan, bidang, dan status.
// Akun login (undangan, nonaktif, hapus) dikelola di halaman Manajemen akun.
//
// Isi berkas:
//   - PegawaiDialog : modal formulir tambah pegawai atau pengubahan data
//   - PegawaiTab : tabel data pegawai dengan filter, aksi Ubah, dan paginasi
//
// Catatan penting:
//   - NIP opsional untuk pegawai non-ASN atau tenaga honorer.
//   - Nomor telepon diambil dari kontak akun pegawai dan hanya ditampilkan di sini.
//   - Validasi satu pintu di server memastikan NIP tidak bentrok sebelum simpan.
//
// Dipakai oleh: master-view.tsx
// =============================================================================

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, SearchX, Send, Users } from "lucide-react";
import Link from "next/link";
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
  jabatan: z.string().trim().max(150, "Jabatan maksimal 150 karakter"),
  status: z.enum(["aktif", "nonaktif"]),
});
type Nilai = z.infer<typeof schema>;

function PegawaiDialog({ pegawai, unit, onClose }: { pegawai: PegawaiAdmin | "baru"; unit: BidangAdmin[]; onClose: () => void }) {
  const simpan = useSimpanPegawai();
  const [galat, setGalat] = useState<string | null>(null);
  const awal = pegawai === "baru" ? null : pegawai;
  const { register, control, handleSubmit, setError, formState } = useForm<Nilai>({
    resolver: zodResolver(schema),
    defaultValues: {
      nip: awal?.nip ?? "",
      nama: awal?.nama ?? "",
      jabatan: awal?.jabatan ?? "",
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
          jabatan: v.jabatan || null,
          bidangId: Number(v.bidangId),
          aktif: awal ? v.status === "aktif" : undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success(awal ? "Data pegawai diperbarui" : "Pegawai ditambahkan");
          onClose();
        },
        onError: (e) =>
          setGalat(terapkanGalatServer(e, setError, { nip: "nip", nama: "nama", jabatan: "jabatan", bidangId: "bidangId" }) || null),
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
      <Field data-invalid={!!formState.errors.jabatan}>
        <FieldLabel htmlFor="pegawai-jabatan">
          Jabatan <span className="font-normal text-muted-foreground">(opsional)</span>
        </FieldLabel>
        <Input id="pegawai-jabatan" maxLength={150} className="h-10" placeholder="Contoh: Pranata Komputer Ahli Muda" aria-invalid={!!formState.errors.jabatan} {...register("jabatan")} />
        <FieldError errors={[formState.errors.jabatan]} />
      </Field>
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

const FILTER_AWAL: FilterPegawai = { q: "", unit: null, aktif: null, page: 1 };

// Pegawai aktif tanpa akun login: data pegawai tetap dipakai (mis. penanggung jawab),
// tetapi belum bisa masuk, jadi statusnya bukan "Aktif". Label membawa admin ke tab undangan.
function StatusPegawai({ p }: { p: PegawaiAdmin }) {
  if (p.akun || !p.aktif) return <BadgeAktif aktif={p.aktif} />;
  return (
    <Link
      href="/admin/akun?tab=belum"
      className="inline-flex items-center gap-1 rounded-md bg-status-berlangsung px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap text-status-berlangsung-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <Send aria-hidden className="size-3" />
      Belum punya akun
    </Link>
  );
}

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
      {
        id: "jabatan",
        header: "Jabatan",
        cell: ({ row }) => (
          <span className="block max-w-56 min-w-36 text-sm whitespace-normal">{row.original.jabatan ?? <span className="text-muted-foreground">-</span>}</span>
        ),
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
      { id: "status", header: "Status", cell: ({ row }) => <StatusPegawai p={row.original} /> },
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
                  <>
                    <span className={cn(!p.aktif && "text-muted-foreground")}>{p.nama}</span>
                    <span className="block text-xs font-normal text-muted-foreground">{p.jabatan ?? "Jabatan belum diisi"}</span>
                  </>
                }
                aksi={<TombolUbah nama={p.nama} onClick={() => setDialog(p)} />}
              >
                <UnitChip className="max-w-full self-start whitespace-normal">{p.bidang.nama}</UnitChip>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground tabular-nums">
                  <span>NIP {p.nip ?? "-"}</span>
                  <span>Telp {p.kontak ? formatTelp(p.kontak) : "-"}</span>
                  <StatusPegawai p={p} />
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
