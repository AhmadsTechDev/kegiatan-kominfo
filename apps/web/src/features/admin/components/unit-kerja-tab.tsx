// =============================================================================
// TAB MASTER STRUKTUR ORGANISASI DAN UNIT KERJA
// =============================================================================
// Gunanya: menyediakan antarmuka pengelolaan data unit kerja dinas, meliputi unit
// utama (Dinas/Bidang), unit turunan (Sub Bagian/Seksi), dan hierarki jenisnya.
//
// Isi berkas:
//   - SelNamaUnit : perender nama unit kerja beserta ikon tingkatan hierarki
//   - UnitDialog : modal formulir pembuatan dan pembaruan data unit kerja dinas
//   - UnitKerjaTab : panel tabel daftar unit kerja dengan filter induk dan aksi
//
// Cara kerja:
//   1. Memuat daftar unit kerja berdasarkan tingkatannya (unit utama atau sub-unit).
//   2. Formulir unit kerja menentukan unit induk yang sah sesuai jenis tingkatan terpilih.
//   3. Administrator dapat menyaring sub-unit berdasarkan unit induk atasannya.
//   4. Menyediakan panel samping (Sheet) untuk mengelola master jenis unit secara langsung.
//
// Catatan penting:
//   - Kode unit bersifat opsional; jika dikosongkan, server mengisinya secara otomatis.
//   - Kegiatan yang dicatat oleh unit turunan otomatis terhitung pada rekap unit induknya.
//   - Dialog tambah unit induk baru dapat dibuka langsung saat menyusun hierarki unit.
//
// Dipakai oleh: master-view.tsx
// =============================================================================

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, ChevronRight, CornerDownRight, Layers, Plus, SearchX, Users } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { FormDialog, Wajib } from "@/components/shared/form-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatAngka } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useJenisUnitAdmin, useSimpanUnitKerja, useUnitKerjaAdmin } from "../hooks/use-admin";
import type { JenisUnitAdmin, UnitKerjaAdmin } from "../types";
import { AksiBaris, BadgeAktif, KolomCari, terapkanGalatServer } from "./admin-shared";
import { JenisUnitDialog, JenisUnitTab } from "./jenis-unit-tab";

const TAMBAH_BARU = "__baru__";

const schema = z.object({
  kode: z
    .string()
    .trim()
    .max(30, "Kode maksimal 30 karakter")
    .regex(/^[A-Za-z0-9-]*$/, "Hanya huruf, angka, atau tanda hubung"),
  nama: z.string().trim().min(1, "Nama unit wajib diisi").max(150, "Nama maksimal 150 karakter"),
  jenisUnitId: z.string().min(1, "Jenis unit wajib dipilih"),
  parentId: z.string(),
});
type Nilai = z.infer<typeof schema>;

export type TingkatUnit = "utama" | "turunan";
const SEMUA = "semua";

function SelNamaUnit({ u, turunan }: { u: UnitKerjaAdmin; turunan: boolean }) {
  return (
    <span className="flex max-w-120 min-w-56 items-center gap-3 whitespace-normal">
      <span
        aria-hidden
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg",
          turunan ? "size-8 bg-muted text-muted-foreground" : "size-9 bg-secondary text-primary",
          !u.aktif && "opacity-50",
        )}
      >
        {turunan ? <CornerDownRight className="size-3.5" /> : <Building2 className="size-4.5" />}
      </span>
      <span className={cn("font-semibold", turunan && "font-medium", !u.aktif && "text-muted-foreground")}>
        {u.nama}
      </span>
    </span>
  );
}

function UnitDialog({
  unit,
  semua,
  jenisAwal,
  onClose,
  onDibuat,
}: {
  unit: UnitKerjaAdmin | "baru";
  semua: UnitKerjaAdmin[];
  jenisAwal?: number;
  onClose: () => void;
  onDibuat?: (id: number) => void;
}) {
  const simpan = useSimpanUnitKerja();
  const daftarJenis = useJenisUnitAdmin();
  const [galat, setGalat] = useState<string | null>(null);
  const [tambahJenis, setTambahJenis] = useState(false);
  const [tambahInduk, setTambahInduk] = useState(false);
  const awal = unit === "baru" ? null : unit;
  const { register, control, handleSubmit, setError, setValue, formState } = useForm<Nilai>({
    resolver: zodResolver(schema),
    defaultValues: {
      kode: awal?.kode ?? "",
      nama: awal?.nama ?? "",
      jenisUnitId: awal ? String(awal.jenisUnitId) : jenisAwal ? String(jenisAwal) : "",
      parentId: awal?.parentId ? String(awal.parentId) : "",
    },
  });
  const semuaJenis = daftarJenis.data ?? [];
  const jenisId = Number(useWatch({ control, name: "jenisUnitId" }));
  const jenis = semuaJenis.find((j) => j.id === jenisId);
  const jenisInduk = semuaJenis.find((j) => j.id === jenis?.indukJenisId);
  const pilihanJenis = semuaJenis.filter((j) => j.aktif || j.id === awal?.jenisUnitId);
  const calonInduk = semua.filter((u) => jenisInduk && u.jenisUnitId === jenisInduk.id && u.id !== awal?.id && (u.aktif || u.id === awal?.parentId));

  const kirim = handleSubmit((v) => {
    setGalat(null);
    if (jenisInduk && !v.parentId) return setError("parentId", { message: "Unit induk wajib dipilih" });
    simpan.mutate(
      {
        id: awal?.id,
        isi: {
          kode: v.kode.toUpperCase() || undefined,
          nama: v.nama,
          jenisUnitId: Number(v.jenisUnitId),
          parentId: jenisInduk ? Number(v.parentId) : null,
          aktif: awal?.aktif,
        },
      },
      {
        onSuccess: (hasil) => {
          toast.success(awal ? "Unit kerja diperbarui" : "Unit kerja ditambahkan");
          if (!awal) onDibuat?.(hasil.id);
          onClose();
        },
        onError: (e) => setGalat(terapkanGalatServer(e, setError, { kode: "kode", nama: "nama", jenisUnitId: "jenisUnitId", parentId: "parentId" }) || null),
      },
    );
  });

  return (
    <>
      <FormDialog
        open
        onOpenChange={(v) => !v && onClose()}
        title={awal ? `Ubah unit "${awal.nama}"` : jenisAwal ? "Tambah unit induk" : "Tambah unit kerja"}
        description="Jenis unit menentukan unit induknya, mis. seksi berada di bawah bidang. Kegiatan unit turunan ikut terhitung ke unit induknya."
        onSubmit={kirim}
        pending={simpan.isPending}
        submitLabel={awal ? "Simpan perubahan" : "Tambah unit"}
        galat={galat}
      >
        <div className="grid gap-4">
          <Field data-invalid={!!formState.errors.nama}>
            <FieldLabel htmlFor="unit-nama">
              Nama unit <Wajib />
            </FieldLabel>
            <Input
              id="unit-nama"
              className="h-10"
              maxLength={150}
              placeholder={awal ? undefined : "Contoh: Seksi Pengelolaan Data"}
              autoFocus={!awal}
              aria-invalid={!!formState.errors.nama}
              {...register("nama")}
            />
            <FieldError errors={[formState.errors.nama]} />
          </Field>
        </div>
        <Field data-invalid={!!formState.errors.jenisUnitId}>
          <FieldLabel htmlFor="unit-jenis">
            Jenis unit <Wajib />
          </FieldLabel>
          <Controller
            control={control}
            name="jenisUnitId"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(v) => {
                  if (v === TAMBAH_BARU) return setTambahJenis(true);
                  field.onChange(v);
                  setValue("parentId", "");
                }}
              >
                <SelectTrigger id="unit-jenis" className="h-10 w-full" aria-invalid={!!formState.errors.jenisUnitId}>
                  <SelectValue placeholder={daftarJenis.isPending ? "Memuat..." : "Pilih jenis unit"} />
                </SelectTrigger>
                <SelectContent>
                  {pilihanJenis.map((j) => (
                    <SelectItem key={j.id} value={String(j.id)}>
                      {j.nama}
                    </SelectItem>
                  ))}
                  <SelectSeparator />
                  <SelectItem value={TAMBAH_BARU} className="font-medium text-primary">
                    <Plus aria-hidden className="text-primary" />
                    Tambah jenis baru
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {jenis && !jenisInduk && <FieldDescription>{jenis.nama} adalah unit tertinggi, tanpa unit induk.</FieldDescription>}
          <FieldError errors={[formState.errors.jenisUnitId]} />
        </Field>
        {jenisInduk && (
          <Field data-invalid={!!formState.errors.parentId}>
            <FieldLabel htmlFor="unit-induk">
              Unit induk <Wajib />
            </FieldLabel>
            <Controller
              control={control}
              name="parentId"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(v) => {
                    if (v === TAMBAH_BARU) return setTambahInduk(true);
                    field.onChange(v);
                  }}
                >
                  <SelectTrigger id="unit-induk" className="h-10 w-full" aria-invalid={!!formState.errors.parentId}>
                    <SelectValue placeholder={`Pilih ${jenisInduk.nama.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {calonInduk.map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.nama}
                      </SelectItem>
                    ))}
                    {calonInduk.length > 0 && <SelectSeparator />}
                    <SelectItem value={TAMBAH_BARU} className="font-medium text-primary">
                      <Plus aria-hidden className="text-primary" />
                      Tambah {jenisInduk.nama.toLowerCase()} baru
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <FieldDescription>
              Induk {jenis!.nama.toLowerCase()} harus {jenisInduk.nama.toLowerCase()}. Nama unit induk bisa diubah dari tombol pensil di tabel.
            </FieldDescription>
            <FieldError errors={[formState.errors.parentId]} />
          </Field>
        )}
      </FormDialog>

      {tambahJenis && (
        <JenisUnitDialog
          jenis="baru"
          semua={semuaJenis}
          onClose={() => setTambahJenis(false)}
          onDibuat={(id) => {
            setValue("jenisUnitId", String(id), { shouldValidate: true });
            setValue("parentId", "");
          }}
        />
      )}
      {tambahInduk && jenisInduk && (
        <UnitDialog
          unit="baru"
          semua={semua}
          jenisAwal={jenisInduk.id}
          onClose={() => setTambahInduk(false)}
          onDibuat={(id) => setValue("parentId", String(id), { shouldValidate: true })}
        />
      )}
    </>
  );
}

export function UnitKerjaTab({
  tingkat,
  indukAwal,
  onLihatTurunan,
}: {
  tingkat: TingkatUnit;
  indukAwal?: number | null;
  onLihatTurunan?: (indukId: number) => void;
}) {
  const daftar = useUnitKerjaAdmin();
  const daftarJenis = useJenisUnitAdmin();
  const simpan = useSimpanUnitKerja();
  const [dialog, setDialog] = useState<UnitKerjaAdmin | "baru" | null>(null);
  const [konfirmasi, setKonfirmasi] = useState<UnitKerjaAdmin | null>(null);
  const [kata, setKata] = useState("");
  const [induk, setInduk] = useState(indukAwal ? String(indukAwal) : SEMUA);
  const [kelolaJenis, setKelolaJenis] = useState(false);
  const turunan = tingkat === "turunan";

  const { mutate } = simpan;
  const jenisTertinggi = useMemo(() => new Set((daftarJenis.data ?? []).filter((j: JenisUnitAdmin) => j.indukJenisId === null).map((j) => j.id)), [daftarJenis.data]);

  const semua = useMemo(() => daftar.data ?? [], [daftar.data]);
  const perId = useMemo(() => new Map(semua.map((u) => [u.id, u])), [semua]);
  const jumlahTurunan = useMemo(() => {
    const n = new Map<number, number>();
    for (const u of semua) if (u.parentId !== null) n.set(u.parentId, (n.get(u.parentId) ?? 0) + 1);
    return n;
  }, [semua]);
  const pilihanInduk = useMemo(() => semua.filter((u) => jumlahTurunan.has(u.id)), [semua, jumlahTurunan]);
  const sesuaiTingkat = useMemo(() => semua.filter((u) => (turunan ? u.parentId !== null : u.parentId === null)), [semua, turunan]);
  const baris = useMemo(() => {
    const q = kata.trim().toLowerCase();
    const namaInduk = (u: UnitKerjaAdmin) => (u.parentId !== null ? (perId.get(u.parentId)?.nama ?? "") : "");
    return sesuaiTingkat
      .filter((u) => !turunan || induk === SEMUA || String(u.parentId) === induk)
      .filter((u) => !q || u.nama.toLowerCase().includes(q) || namaInduk(u).toLowerCase().includes(q))
      .toSorted((a, b) => namaInduk(a).localeCompare(namaInduk(b), "id") || a.id - b.id);
  }, [sesuaiTingkat, turunan, induk, kata, perId]);

  const ubahStatus = useCallback(
    (u: UnitKerjaAdmin, aktif: boolean) =>
      mutate(
        { id: u.id, isi: { kode: u.kode, nama: u.nama, jenisUnitId: u.jenisUnitId, parentId: u.parentId, aktif } },
        {
          onSuccess: () => {
            toast.success(aktif ? `${u.nama} diaktifkan` : `${u.nama} dinonaktifkan`);
            setKonfirmasi(null);
          },
          onError: (e) => toast.error(e.message),
        },
      ),
    [mutate],
  );

  const kolom = useMemo<DataTableColumn<UnitKerjaAdmin>[]>(
    () => [
      { id: "nama", header: turunan ? "Sub bagian / seksi" : "Unit kerja", cell: ({ row }) => <SelNamaUnit u={row.original} turunan={turunan} /> },
      ...(turunan
        ? [
            {
              id: "induk",
              header: "Di bawah",
              cell: ({ row }: { row: { original: UnitKerjaAdmin } }) => (
                <span className="block max-w-72 min-w-40 text-sm whitespace-normal text-muted-foreground">
                  {row.original.parentId !== null ? perId.get(row.original.parentId)?.nama : "-"}
                </span>
              ),
            },
          ]
        : []),
      {
        id: "jenis",
        header: "Jenis",
        cell: ({ row }) => (
          <span
            className={cn(
              "rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap",
              jenisTertinggi.has(row.original.jenisUnitId) ? "bg-secondary text-primary" : "bg-muted text-muted-foreground",
            )}
          >
            {row.original.jenis}
          </span>
        ),
      },
      ...(!turunan
        ? [
            {
              id: "turunan",
              header: "Sub unit",
              cell: ({ row }: { row: { original: UnitKerjaAdmin } }) => {
                const n = jumlahTurunan.get(row.original.id) ?? 0;
                if (!n) return <span className="text-sm text-muted-foreground">-</span>;
                return (
                  <button
                    type="button"
                    onClick={() => onLihatTurunan?.(row.original.id)}
                    className="inline-flex items-center gap-1 rounded text-sm font-medium whitespace-nowrap text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    {n} sub unit
                    <ChevronRight aria-hidden className="size-3.5" />
                  </button>
                );
              },
            },
          ]
        : []),
      {
        id: "pegawai",
        header: () => <span className="block text-right">Pegawai aktif</span>,
        cell: ({ row }) => (
          <span className={cn("flex items-center justify-end gap-1.5 tabular-nums", row.original.jumlahPegawaiAktif === 0 && "text-muted-foreground")}>
            <Users aria-hidden className="size-3.5 text-muted-foreground" />
            {formatAngka(row.original.jumlahPegawaiAktif)}
          </span>
        ),
      },
      { id: "status", header: "Status", cell: ({ row }) => <BadgeAktif aktif={row.original.aktif} /> },
      {
        id: "aksi",
        header: () => <span className="block text-right">Aksi</span>,
        cell: ({ row }) => {
          const u = row.original;
          return <AksiBaris nama={u.nama} aktif={u.aktif} onUbah={() => setDialog(u)} onUbahStatus={() => (u.aktif ? setKonfirmasi(u) : ubahStatus(u, true))} />;
        },
      },
    ],
    [turunan, perId, jenisTertinggi, jumlahTurunan, onLihatTurunan, ubahStatus],
  );

  if (daftar.isError) return <ErrorState message={daftar.error.message} onRetry={() => daftar.refetch()} retrying={daftar.isRefetching} />;

  const adaFilter = kata.trim() !== "" || (turunan && induk !== SEMUA);
  return (
    <>
      <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center md:px-5">
        <KolomCari
          value={kata}
          onChange={setKata}
          placeholder={turunan ? "Cari sub bagian atau seksi..." : "Cari unit kerja..."}
          label={turunan ? "Cari sub bagian atau seksi" : "Cari unit kerja"}
          className="sm:max-w-xs sm:flex-1"
        />
        {turunan && (
          <Select value={induk} onValueChange={setInduk}>
            <SelectTrigger className="h-10 w-full sm:w-64" aria-label="Filter unit induk">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SEMUA}>Semua unit induk</SelectItem>
              {pilihanInduk.map((u) => (
                <SelectItem key={u.id} value={String(u.id)}>
                  {u.nama}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <Button variant="outline" className="h-10" onClick={() => setKelolaJenis(true)}>
            <Layers aria-hidden />
            Jenis unit
          </Button>
          <Button className="h-10" onClick={() => setDialog("baru")}>
            <Plus aria-hidden />
            {turunan ? "Tambah sub unit" : "Tambah unit"}
          </Button>
        </div>
      </div>
      <DataTable
        columns={kolom}
        data={baris}
        isLoading={daftar.isPending}
        bleed
        caption={turunan ? "Daftar sub bagian dan seksi" : "Daftar unit kerja utama"}
        getRowKey={(u) => String(u.id)}
        empty={
          adaFilter
            ? { icon: SearchX, title: "Tidak ada unit yang cocok dengan pencarian atau filter." }
            : { icon: Building2, title: turunan ? "Belum ada sub bagian atau seksi." : "Belum ada unit kerja." }
        }
      />
      {daftar.data && (
        <p className="border-t border-muted px-4 py-3 text-xs text-muted-foreground md:px-5">
          Menampilkan {formatAngka(baris.length)} dari {formatAngka(sesuaiTingkat.length)} {turunan ? "sub bagian dan seksi" : "unit kerja utama"}
        </p>
      )}
      {dialog && daftar.data && <UnitDialog unit={dialog} semua={daftar.data} onClose={() => setDialog(null)} />}
      {konfirmasi && (
        <ConfirmDialog
          open
          onOpenChange={(v) => !v && setKonfirmasi(null)}
          title={`Nonaktifkan unit "${konfirmasi.nama}"?`}
          description="Unit ini tidak bisa dipilih lagi untuk pegawai baru."
          confirmLabel="Nonaktifkan"
          pendingLabel="Menonaktifkan..."
          pending={simpan.isPending}
          onConfirm={() => ubahStatus(konfirmasi, false)}
        />
      )}
      <Sheet open={kelolaJenis} onOpenChange={setKelolaJenis}>
        <SheetContent side="right" className="gap-0 overflow-y-auto p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-2xl">
          <SheetHeader className="border-b">
            <SheetTitle>Jenis unit</SheetTitle>
            <SheetDescription>Tingkatan struktur organisasi, mis. Bidang membawahi Seksi.</SheetDescription>
          </SheetHeader>
          <JenisUnitTab />
        </SheetContent>
      </Sheet>
    </>
  );
}
