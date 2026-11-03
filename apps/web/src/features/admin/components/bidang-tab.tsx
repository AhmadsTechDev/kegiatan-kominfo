// =============================================================================
// TAB MASTER BIDANG DAN SUB BIDANG
// =============================================================================
// Gunanya: menyediakan antarmuka pengelolaan bidang dan sub bidang. Tingkatnya
// ditentukan induknya: tanpa induk berarti bidang, dengan induk berarti sub bidang.
//
// Isi berkas:
//   - SelNamaUnit : perender nama bidang beserta ikon tingkatan hierarki
//   - UnitDialog : modal formulir pembuatan dan pembaruan data bidang dinas
//   - BidangTab : panel tabel daftar bidang dengan filter induk dan aksi
//
// Cara kerja:
//   1. Memuat daftar berdasarkan tingkatnya (bidang atau sub bidang).
//   2. Formulir sub bidang mewajibkan memilih satu bidang sebagai induknya.
//   3. Administrator dapat menyaring sub bidang berdasarkan bidang induknya.
//   4. Yang nonaktif dipisah ke tab Nonaktif agar tidak mengotori daftar utama.
//   5. Bidang yang belum dipakai pegawai, kegiatan, atau sub bidang bisa dihapus permanen.
//
// Catatan penting:
//   - Kode unit bersifat opsional; jika dikosongkan, server mengisinya secara otomatis.
//   - Kegiatan yang dicatat oleh unit turunan otomatis terhitung pada rekap unit induknya.
//
// Dipakai oleh: master-view.tsx
// =============================================================================

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, ChevronRight, CornerDownRight, Plus, SearchX, Users } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { FormDialog } from "@/components/shared/form-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatAngka } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useBidangAdmin, useHapusBidang, useSimpanBidang } from "../hooks/use-admin";
import type { BidangAdmin } from "../types";
import { AksiBaris, BadgeAktif, KartuMaster, KolomCari, PilihanTab, terapkanGalatServer } from "./admin-shared";

const schema = z.object({
  kode: z
    .string()
    .trim()
    .max(30, "Kode maksimal 30 karakter")
    .regex(/^[A-Za-z0-9-]*$/, "Hanya huruf, angka, atau tanda hubung"),
  nama: z.string().trim().min(1, "Nama unit wajib diisi").max(150, "Nama maksimal 150 karakter"),
  parentId: z.string(),
});
type Nilai = z.infer<typeof schema>;

export type TingkatUnit = "utama" | "turunan";
const SEMUA = "semua";

function SelNamaUnit({ u, turunan }: { u: BidangAdmin; turunan: boolean }) {
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

// Tingkat mengikuti tab: tab Bidang membuat bidang (tanpa induk), tab Sub bidang membuat sub bidang di bawah satu bidang
function UnitDialog({ unit, semua, tingkat, onClose }: { unit: BidangAdmin | "baru"; semua: BidangAdmin[]; tingkat: TingkatUnit; onClose: () => void }) {
  const simpan = useSimpanBidang();
  const [galat, setGalat] = useState<string | null>(null);
  const awal = unit === "baru" ? null : unit;
  const turunan = awal ? awal.parentId !== null : tingkat === "turunan";
  const { register, control, handleSubmit, setError, formState } = useForm<Nilai>({
    resolver: zodResolver(schema),
    defaultValues: { kode: awal?.kode ?? "", nama: awal?.nama ?? "", parentId: awal?.parentId ? String(awal.parentId) : "" },
  });
  const calonInduk = semua.filter((u) => u.parentId === null && u.id !== awal?.id && (u.aktif || u.id === awal?.parentId));
  const noun = turunan ? "sub bidang" : "bidang";

  const kirim = handleSubmit((v) => {
    setGalat(null);
    if (turunan && !v.parentId) return setError("parentId", { message: "Bidang induk wajib dipilih" });
    simpan.mutate(
      {
        id: awal?.id,
        isi: { kode: v.kode.toUpperCase() || undefined, nama: v.nama, parentId: turunan ? Number(v.parentId) : null, aktif: awal?.aktif },
      },
      {
        onSuccess: () => {
          toast.success(awal ? `${turunan ? "Sub bidang" : "Bidang"} diperbarui` : `${turunan ? "Sub bidang" : "Bidang"} ditambahkan`);
          onClose();
        },
        onError: (e) => setGalat(terapkanGalatServer(e, setError, { kode: "kode", nama: "nama", parentId: "parentId" }) || null),
      },
    );
  });

  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title={awal ? `Ubah "${awal.nama}"` : `Tambah ${noun}`}
      onSubmit={kirim}
      pending={simpan.isPending}
      submitLabel={awal ? "Simpan perubahan" : `Tambah ${noun}`}
      galat={galat}
    >
      <Field data-invalid={!!formState.errors.nama}>
        <FieldLabel htmlFor="unit-nama">
          Nama {noun}
        </FieldLabel>
        <Input
          id="unit-nama"
          className="h-10"
          maxLength={150}
          placeholder={awal ? undefined : turunan ? "Contoh: Sub Bidang Pengelolaan Data" : "Contoh: Bidang Teknologi Informasi dan Persandian"}
          autoFocus={!awal}
          aria-invalid={!!formState.errors.nama}
          {...register("nama")}
        />
        <FieldError errors={[formState.errors.nama]} />
      </Field>
      {turunan && (
        <Field data-invalid={!!formState.errors.parentId}>
          <FieldLabel htmlFor="unit-induk">
            Bidang induk
          </FieldLabel>
          <Controller
            control={control}
            name="parentId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="unit-induk" className="h-10 w-full" aria-invalid={!!formState.errors.parentId}>
                  <SelectValue placeholder="Pilih bidang" />
                </SelectTrigger>
                <SelectContent>
                  {calonInduk.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {calonInduk.length === 0 && <FieldDescription>Belum ada bidang. Tambahkan dulu di tab Bidang.</FieldDescription>}
          <FieldError errors={[formState.errors.parentId]} />
        </Field>
      )}
    </FormDialog>
  );
}

export function BidangTab({
  tingkat,
  indukAwal,
  onLihatTurunan,
}: {
  tingkat: TingkatUnit;
  indukAwal?: number | null;
  onLihatTurunan?: (indukId: number) => void;
}) {
  const daftar = useBidangAdmin();
  const simpan = useSimpanBidang();
  const hapus = useHapusBidang();
  const [dialog, setDialog] = useState<BidangAdmin | "baru" | null>(null);
  const [konfirmasi, setKonfirmasi] = useState<BidangAdmin | null>(null);
  const [hapusTarget, setHapusTarget] = useState<BidangAdmin | null>(null);
  const [lihat, setLihat] = useState<"aktif" | "nonaktif">("aktif");
  const [kata, setKata] = useState("");
  const [induk, setInduk] = useState(indukAwal ? String(indukAwal) : SEMUA);
  const turunan = tingkat === "turunan";

  const { mutate } = simpan;

  const semua = useMemo(() => daftar.data ?? [], [daftar.data]);
  const perId = useMemo(() => new Map(semua.map((u) => [u.id, u])), [semua]);
  const jumlahTurunan = useMemo(() => {
    const n = new Map<number, number>();
    for (const u of semua) if (u.parentId !== null) n.set(u.parentId, (n.get(u.parentId) ?? 0) + 1);
    return n;
  }, [semua]);
  const pilihanInduk = useMemo(() => semua.filter((u) => jumlahTurunan.has(u.id)), [semua, jumlahTurunan]);
  const sesuaiTingkat = useMemo(
    () => semua.filter((u) => (turunan ? u.parentId !== null : u.parentId === null) && u.aktif === (lihat === "aktif")),
    [semua, turunan, lihat],
  );
  const jumlahStatus = useMemo(() => {
    const tingkat = semua.filter((u) => (turunan ? u.parentId !== null : u.parentId === null));
    return { aktif: tingkat.filter((u) => u.aktif).length, nonaktif: tingkat.filter((u) => !u.aktif).length };
  }, [semua, turunan]);
  const baris = useMemo(() => {
    const q = kata.trim().toLowerCase();
    const namaInduk = (u: BidangAdmin) => (u.parentId !== null ? (perId.get(u.parentId)?.nama ?? "") : "");
    return sesuaiTingkat
      .filter((u) => !turunan || induk === SEMUA || String(u.parentId) === induk)
      .filter((u) => !q || u.nama.toLowerCase().includes(q) || namaInduk(u).toLowerCase().includes(q))
      .toSorted((a, b) => namaInduk(a).localeCompare(namaInduk(b), "id") || a.id - b.id);
  }, [sesuaiTingkat, turunan, induk, kata, perId]);

  const ubahStatus = useCallback(
    (u: BidangAdmin, aktif: boolean) =>
      mutate(
        { id: u.id, isi: { kode: u.kode, nama: u.nama, parentId: u.parentId, aktif } },
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

  const kolom = useMemo<DataTableColumn<BidangAdmin>[]>(
    () => [
      { id: "nama", header: turunan ? "Sub bidang" : "Bidang", cell: ({ row }) => <SelNamaUnit u={row.original} turunan={turunan} /> },
      ...(turunan
        ? [
            {
              id: "induk",
              header: "Di bawah",
              cell: ({ row }: { row: { original: BidangAdmin } }) => (
                <span className="block max-w-72 min-w-40 text-sm whitespace-normal text-muted-foreground">
                  {row.original.parentId !== null ? perId.get(row.original.parentId)?.nama : "-"}
                </span>
              ),
            },
          ]
        : []),
      ...(!turunan
        ? [
            {
              id: "turunan",
              header: "Sub bidang",
              cell: ({ row }: { row: { original: BidangAdmin } }) => {
                const n = jumlahTurunan.get(row.original.id) ?? 0;
                if (!n) return <span className="text-sm text-muted-foreground">-</span>;
                return (
                  <button
                    type="button"
                    onClick={() => onLihatTurunan?.(row.original.id)}
                    className="inline-flex items-center gap-1 rounded text-sm font-medium whitespace-nowrap text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    {n} sub bidang
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
          return (
            <AksiBaris
              nama={u.nama}
              aktif={u.aktif}
              onUbah={() => setDialog(u)}
              onUbahStatus={() => (u.aktif ? setKonfirmasi(u) : ubahStatus(u, true))}
              onHapus={u.bisaDihapus ? () => setHapusTarget(u) : undefined}
            />
          );
        },
      },
    ],
    [turunan, perId, jumlahTurunan, onLihatTurunan, ubahStatus],
  );

  if (daftar.isError) return <ErrorState message={daftar.error.message} onRetry={() => daftar.refetch()} retrying={daftar.isRefetching} />;

  const adaFilter = kata.trim() !== "" || (turunan && induk !== SEMUA);
  return (
    <>
      <div className="px-4 pt-3 md:px-5">
        <PilihanTab
          label={`Status ${turunan ? "sub bidang" : "bidang"}`}
          value={lihat}
          onChange={setLihat}
          opsi={[
            { nilai: "aktif", label: "Aktif", jumlah: jumlahStatus.aktif },
            { nilai: "nonaktif", label: "Nonaktif", jumlah: jumlahStatus.nonaktif },
          ]}
        />
      </div>
      <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center md:px-5">
        <KolomCari
          value={kata}
          onChange={setKata}
          placeholder={turunan ? "Cari sub bidang..." : "Cari bidang..."}
          label={turunan ? "Cari sub bidang" : "Cari bidang"}
          className="sm:max-w-xs sm:flex-1"
        />
        {turunan && (
          <Select value={induk} onValueChange={setInduk}>
            <SelectTrigger className="h-10 w-full sm:w-64" aria-label="Filter bidang induk">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SEMUA}>Semua bidang induk</SelectItem>
              {pilihanInduk.map((u) => (
                <SelectItem key={u.id} value={String(u.id)}>
                  {u.nama}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <Button className="h-10 pointer-coarse:min-h-11" onClick={() => setDialog("baru")}>
            <Plus aria-hidden />
            {turunan ? "Tambah sub bidang" : "Tambah bidang"}
          </Button>
        </div>
      </div>
      <DataTable
        columns={kolom}
        data={baris}
        isLoading={daftar.isPending}
        bleed
        caption={turunan ? "Daftar sub bidang" : "Daftar bidang utama"}
        getRowKey={(u) => String(u.id)}
        renderMobileCard={(u) => (
          <KartuMaster
            judul={<span className={cn(!u.aktif && "text-muted-foreground")}>{u.nama}</span>}
            aksi={
              <AksiBaris
                nama={u.nama}
                aktif={u.aktif}
                onUbah={() => setDialog(u)}
                onUbahStatus={() => (u.aktif ? setKonfirmasi(u) : ubahStatus(u, true))}
                onHapus={u.bisaDihapus ? () => setHapusTarget(u) : undefined}
              />
            }
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
              <BadgeAktif aktif={u.aktif} />
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
                <Users aria-hidden className="size-3.5" />
                {formatAngka(u.jumlahPegawaiAktif)} pegawai aktif
              </span>
            </div>
            {turunan && u.parentId !== null && <p className="text-xs text-muted-foreground">Di bawah {perId.get(u.parentId)?.nama}</p>}
            {!turunan && (jumlahTurunan.get(u.id) ?? 0) > 0 && (
              <button
                type="button"
                onClick={() => onLihatTurunan?.(u.id)}
                className="inline-flex items-center gap-1 self-start rounded text-sm font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none pointer-coarse:min-h-11"
              >
                {jumlahTurunan.get(u.id)} sub bidang
                <ChevronRight aria-hidden className="size-3.5" />
              </button>
            )}
          </KartuMaster>
        )}
        empty={
          adaFilter
            ? { icon: SearchX, title: "Tidak ada unit yang cocok dengan pencarian atau filter." }
            : { icon: Building2, title: `${lihat === "nonaktif" ? "Tidak ada" : "Belum ada"} ${turunan ? "sub bidang" : "bidang"}${lihat === "nonaktif" ? " nonaktif" : ""}.` }
        }
      />
      {daftar.data && (
        <p className="border-t border-muted px-4 py-3 text-xs text-muted-foreground md:px-5">
          Menampilkan {formatAngka(baris.length)} dari {formatAngka(sesuaiTingkat.length)} {turunan ? "sub bidang" : "bidang utama"}
        </p>
      )}
      {dialog && daftar.data && <UnitDialog unit={dialog} semua={daftar.data} tingkat={tingkat} onClose={() => setDialog(null)} />}
      {hapusTarget && (
        <ConfirmDialog
          open
          onOpenChange={(v) => !v && setHapusTarget(null)}
          title={`Hapus ${hapusTarget.parentId !== null ? "sub bidang" : "bidang"} "${hapusTarget.nama}"?`}
          description="Dihapus permanen dan tidak bisa dikembalikan."
          confirmLabel="Hapus"
          pendingLabel="Menghapus..."
          pending={hapus.isPending}
          onConfirm={() =>
            hapus.mutate(hapusTarget.id, {
              onSuccess: () => {
                toast.success(`${hapusTarget.nama} dihapus`);
                setHapusTarget(null);
              },
              onError: (e) => {
                toast.error(e.message);
                setHapusTarget(null);
              },
            })
          }
        />
      )}
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
    </>
  );
}
