"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Tags } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { FormDialog } from "@/components/shared/form-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { formatAngka } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useJenisAdmin, useSimpanJenis } from "../hooks/use-admin";
import type { JenisKegiatanAdmin } from "../types";
import { AksiBaris, BadgeAktif, KartuMaster, terapkanGalatServer } from "./admin-shared";

// Tab kelola jenis kegiatan: tambah, ubah nama, jumlah pemakaian, status aktif

const schema = z.object({ nama: z.string().trim().min(1, "Nama jenis wajib diisi").max(100, "Nama maksimal 100 karakter") });
type Nilai = z.infer<typeof schema>;

function JenisDialog({ jenis, onClose }: { jenis: JenisKegiatanAdmin | "baru"; onClose: () => void }) {
  const simpan = useSimpanJenis();
  const [galat, setGalat] = useState<string | null>(null);
  const awal = jenis === "baru" ? null : jenis;
  const { register, handleSubmit, setError, formState } = useForm<Nilai>({
    resolver: zodResolver(schema),
    defaultValues: { nama: awal?.nama ?? "" },
  });

  const kirim = handleSubmit((v) => {
    setGalat(null);
    simpan.mutate(
      { id: awal?.id, isi: { nama: v.nama, aktif: awal?.aktif } },
      {
        onSuccess: () => {
          toast.success(awal ? "Jenis kegiatan diperbarui" : "Jenis kegiatan ditambahkan");
          onClose();
        },
        onError: (e) => setGalat(terapkanGalatServer(e, setError, { nama: "nama" }) || null),
      },
    );
  });

  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title={awal ? `Ubah jenis "${awal.nama}"` : "Tambah jenis kegiatan"}
      description={awal && awal.jumlahKegiatan > 0 ? `Nama baru juga tampil pada ${formatAngka(awal.jumlahKegiatan)} kegiatan yang memakai jenis ini.` : undefined}
      onSubmit={kirim}
      pending={simpan.isPending}
      submitLabel={awal ? "Simpan perubahan" : "Tambah jenis"}
      galat={galat}
    >
      <Field data-invalid={!!formState.errors.nama}>
        <FieldLabel htmlFor="jenis-nama">
          Nama jenis
        </FieldLabel>
        <Input id="jenis-nama" maxLength={100} className="h-10" aria-invalid={!!formState.errors.nama} autoFocus {...register("nama")} />
        <FieldError errors={[formState.errors.nama]} />
      </Field>
    </FormDialog>
  );
}

export function JenisTab() {
  const daftar = useJenisAdmin();
  const simpan = useSimpanJenis();
  const { mutate } = simpan;
  const [dialog, setDialog] = useState<JenisKegiatanAdmin | "baru" | null>(null);
  const [konfirmasi, setKonfirmasi] = useState<JenisKegiatanAdmin | null>(null);

  const ubahStatus = useCallback(
    (j: JenisKegiatanAdmin, aktif: boolean) =>
      mutate(
        { id: j.id, isi: { nama: j.nama, aktif } },
        {
          onSuccess: () => {
            toast.success(aktif ? `${j.nama} diaktifkan` : `${j.nama} dinonaktifkan`);
            setKonfirmasi(null);
          },
          onError: (e) => toast.error(e.message),
        },
      ),
    [mutate],
  );

  const kolom = useMemo<DataTableColumn<JenisKegiatanAdmin>[]>(
    () => [
      {
        id: "nama",
        header: "Jenis kegiatan",
        cell: ({ row }) => <span className={cn("font-semibold", !row.original.aktif && "text-muted-foreground")}>{row.original.nama}</span>,
      },
      { id: "jumlah", header: "Dipakai kegiatan", cell: ({ row }) => <span className="tabular-nums">{formatAngka(row.original.jumlahKegiatan)}</span> },
      { id: "status", header: "Status", cell: ({ row }) => <BadgeAktif aktif={row.original.aktif} /> },
      {
        id: "aksi",
        header: () => <span className="block text-right">Aksi</span>,
        cell: ({ row }) => {
          const j = row.original;
          return (
            <AksiBaris nama={j.nama} aktif={j.aktif} onUbah={() => setDialog(j)} onUbahStatus={() => (j.aktif ? setKonfirmasi(j) : ubahStatus(j, true))} />
          );
        },
      },
    ],
    [ubahStatus],
  );

  if (daftar.isError) return <ErrorState message={daftar.error.message} onRetry={() => daftar.refetch()} retrying={daftar.isRefetching} />;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-5">
        <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground tabular-nums">
          {daftar.data ? `${formatAngka(daftar.data.length)} jenis kegiatan` : "Memuat..."}
        </span>
        <Button className="h-10 pointer-coarse:min-h-11" onClick={() => setDialog("baru")}>
          <Plus aria-hidden />
          Tambah jenis
        </Button>
      </div>
      <DataTable
        columns={kolom}
        data={daftar.data ?? []}
        isLoading={daftar.isPending}
        bleed
        caption="Daftar jenis kegiatan"
        getRowKey={(j) => String(j.id)}
        renderMobileCard={(j) => (
          <KartuMaster
            judul={<span className={cn(!j.aktif && "text-muted-foreground")}>{j.nama}</span>}
            aksi={<AksiBaris nama={j.nama} aktif={j.aktif} onUbah={() => setDialog(j)} onUbahStatus={() => (j.aktif ? setKonfirmasi(j) : ubahStatus(j, true))} />}
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <BadgeAktif aktif={j.aktif} />
              <span className="text-xs text-muted-foreground tabular-nums">Dipakai {formatAngka(j.jumlahKegiatan)} kegiatan</span>
            </div>
          </KartuMaster>
        )}
        empty={{ icon: Tags, title: "Belum ada jenis kegiatan." }}
      />
      {dialog && <JenisDialog jenis={dialog} onClose={() => setDialog(null)} />}
      {konfirmasi && (
        <ConfirmDialog
          open
          onOpenChange={(v) => !v && setKonfirmasi(null)}
          title={`Nonaktifkan jenis "${konfirmasi.nama}"?`}
          description="Jenis ini tidak muncul lagi di form kegiatan baru."
          confirmLabel="Nonaktifkan"
          pendingLabel="Menonaktifkan..."
          pending={simpan.isPending}
          onConfirm={() => ubahStatus(konfirmasi, false)}
        />
      )}
    </>
  );
}
