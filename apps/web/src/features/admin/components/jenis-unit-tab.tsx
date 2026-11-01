// =============================================================================
// TAB DAN DIALOG MASTER TINGKATAN JENIS UNIT KERJA
// =============================================================================
// Gunanya: mengelola hierarki tingkatan jenis unit kerja dalam organisasi,
// seperti Dinas, Bidang, dan Seksi, serta mencegah ketergantungan melingkar.
//
// Isi berkas:
//   - idTurunan : algoritma graf iteratif pendeteksi seluruh turunan jenis unit
//   - JenisUnitDialog : modal formulir tambah atau ubah jenis unit kerja
//   - JenisUnitTab : panel tabel master tingkatan jenis unit kerja beserta aksinya
//
// Cara kerja:
//   1. Admin menentukan nama jenis unit dan jenis induknya dalam struktur hierarki.
//   2. idTurunan menyaring pilihan induk agar jenis tidak dapat memilih dirinya sendiri.
//   3. Posisi induk dikunci otomatis jika sudah ada unit kerja aktif yang menggunakannya.
//
// Catatan penting:
//   - Mencegah relasi hierarki melingkar (circular dependency) pada struktur organisasi.
//   - Menyediakan callback onDibuat saat dibuka dari dialog pembuatan unit kerja baru.
//   - Jenis unit tertinggi tanpa induk ditandai secara visual dengan lencana khusus.
//
// Dipakai oleh: unit-kerja-tab.tsx
// =============================================================================

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Layers, Plus } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { FormDialog, Wajib } from "@/components/shared/form-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatAngka } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useJenisUnitAdmin, useSimpanJenisUnit } from "../hooks/use-admin";
import type { JenisUnitAdmin } from "../types";
import { AksiBaris, BadgeAktif, terapkanGalatServer } from "./admin-shared";

const TERTINGGI = "tertinggi";

const schema = z.object({
  nama: z.string().trim().min(1, "Nama jenis wajib diisi").max(100, "Nama maksimal 100 karakter"),
  induk: z.string(),
});
type Nilai = z.infer<typeof schema>;

function idTurunan(semua: JenisUnitAdmin[], id: number) {
  const hasil = new Set([id]);
  for (let bertambah = true; bertambah; ) {
    bertambah = false;
    for (const j of semua) {
      if (j.indukJenisId != null && hasil.has(j.indukJenisId) && !hasil.has(j.id)) {
        hasil.add(j.id);
        bertambah = true;
      }
    }
  }
  return hasil;
}

export function JenisUnitDialog({
  jenis,
  semua,
  onClose,
  onDibuat,
}: {
  jenis: JenisUnitAdmin | "baru";
  semua: JenisUnitAdmin[];
  onClose: () => void;
  onDibuat?: (id: number) => void;
}) {
  const simpan = useSimpanJenisUnit();
  const [galat, setGalat] = useState<string | null>(null);
  const awal = jenis === "baru" ? null : jenis;
  const { register, control, handleSubmit, setError, formState } = useForm<Nilai>({
    resolver: zodResolver(schema),
    defaultValues: { nama: awal?.nama ?? "", induk: awal?.indukJenisId ? String(awal.indukJenisId) : TERTINGGI },
  });
  const terlarang = awal ? idTurunan(semua, awal.id) : new Set<number>();
  const calonInduk = semua.filter((j) => !terlarang.has(j.id) && (j.aktif || j.id === awal?.indukJenisId));
  const posisiTerkunci = !!awal && awal.jumlahUnitAktif > 0;

  const kirim = handleSubmit((v) => {
    setGalat(null);
    simpan.mutate(
      { id: awal?.id, isi: { nama: v.nama, indukJenisId: v.induk === TERTINGGI ? null : Number(v.induk), aktif: awal?.aktif } },
      {
        onSuccess: (hasil) => {
          toast.success(awal ? "Jenis unit diperbarui" : "Jenis unit ditambahkan");
          if (!awal) onDibuat?.(hasil.id);
          onClose();
        },
        onError: (e) => setGalat(terapkanGalatServer(e, setError, { nama: "nama", indukJenisId: "induk" }) || null),
      },
    );
  });

  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title={awal ? `Ubah jenis "${awal.nama}"` : "Tambah jenis unit"}
      description="Jenis menentukan letak unit di struktur organisasi, mis. seksi selalu berada di bawah bidang."
      onSubmit={kirim}
      pending={simpan.isPending}
      submitLabel={awal ? "Simpan perubahan" : "Tambah jenis"}
      galat={galat}
    >
      <Field data-invalid={!!formState.errors.nama}>
        <FieldLabel htmlFor="jenis-unit-nama">
          Nama jenis <Wajib />
        </FieldLabel>
        <Input id="jenis-unit-nama" maxLength={100} className="h-10" placeholder="Contoh: UPTD" autoFocus aria-invalid={!!formState.errors.nama} {...register("nama")} />
        {awal && awal.jumlahUnit > 0 && <FieldDescription>Nama baru juga tampil pada {formatAngka(awal.jumlahUnit)} unit berjenis ini.</FieldDescription>}
        <FieldError errors={[formState.errors.nama]} />
      </Field>
      <Field data-invalid={!!formState.errors.induk}>
        <FieldLabel htmlFor="jenis-unit-induk">
          Berada di bawah <Wajib />
        </FieldLabel>
        <Controller
          control={control}
          name="induk"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange} disabled={posisiTerkunci}>
              <SelectTrigger id="jenis-unit-induk" className="h-10 w-full" aria-invalid={!!formState.errors.induk}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TERTINGGI}>Tidak ada (unit tertinggi)</SelectItem>
                {calonInduk.map((j) => (
                  <SelectItem key={j.id} value={String(j.id)}>
                    {j.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FieldDescription>
          {posisiTerkunci
            ? `Tidak dapat diubah selama masih ada ${formatAngka(awal.jumlahUnitAktif)} unit aktif berjenis ini.`
            : "Unit berjenis ini wajib memilih unit induk dari jenis tersebut."}
        </FieldDescription>
        <FieldError errors={[formState.errors.induk]} />
      </Field>
    </FormDialog>
  );
}

export function JenisUnitTab() {
  const daftar = useJenisUnitAdmin();
  const simpan = useSimpanJenisUnit();
  const { mutate } = simpan;
  const [dialog, setDialog] = useState<JenisUnitAdmin | "baru" | null>(null);
  const [konfirmasi, setKonfirmasi] = useState<JenisUnitAdmin | null>(null);
  const semua = useMemo(() => daftar.data ?? [], [daftar.data]);

  const ubahStatus = useCallback(
    (j: JenisUnitAdmin, aktif: boolean) =>
      mutate(
        { id: j.id, isi: { nama: j.nama, indukJenisId: j.indukJenisId, aktif } },
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

  const kolom = useMemo<DataTableColumn<JenisUnitAdmin>[]>(
    () => [
      {
        id: "nama",
        header: "Jenis unit",
        cell: ({ row }) => <span className={cn("font-semibold", !row.original.aktif && "text-muted-foreground")}>{row.original.nama}</span>,
      },
      {
        id: "induk",
        header: "Berada di bawah",
        cell: ({ row }) => {
          const induk = semua.find((j) => j.id === row.original.indukJenisId);
          return induk ? (
            <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-muted-foreground">{induk.nama}</span>
          ) : (
            <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-primary">Unit tertinggi</span>
          );
        },
      },
      {
        id: "jumlah",
        header: () => <span className="block text-right">Unit aktif</span>,
        cell: ({ row }) => <span className="block text-right tabular-nums">{formatAngka(row.original.jumlahUnitAktif)}</span>,
      },
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
    [semua, ubahStatus],
  );

  if (daftar.isError) return <ErrorState message={daftar.error.message} onRetry={() => daftar.refetch()} retrying={daftar.isRefetching} />;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-5">
        <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground tabular-nums">
          {daftar.data ? `${formatAngka(daftar.data.length)} jenis unit` : "Memuat..."}
        </span>
        <Button className="h-10" onClick={() => setDialog("baru")}>
          <Plus aria-hidden />
          Tambah jenis
        </Button>
      </div>
      <DataTable
        columns={kolom}
        data={semua}
        isLoading={daftar.isPending}
        bleed
        caption="Daftar jenis unit"
        getRowKey={(j) => String(j.id)}
        empty={{ icon: Layers, title: "Belum ada jenis unit." }}
      />
      {dialog && <JenisUnitDialog jenis={dialog} semua={semua} onClose={() => setDialog(null)} />}
      {konfirmasi && (
        <ConfirmDialog
          open
          onOpenChange={(v) => !v && setKonfirmasi(null)}
          title={`Nonaktifkan jenis "${konfirmasi.nama}"?`}
          description="Jenis ini tidak bisa dipilih lagi untuk unit baru."
          confirmLabel="Nonaktifkan"
          pendingLabel="Menonaktifkan..."
          pending={simpan.isPending}
          onConfirm={() => ubahStatus(konfirmasi, false)}
        />
      )}
    </>
  );
}
