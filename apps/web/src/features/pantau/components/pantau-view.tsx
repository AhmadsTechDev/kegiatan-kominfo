// =============================================================================
// HALAMAN PEMANTAUAN KEGIATAN PIMPINAN
// =============================================================================
// Gunanya: Menampilkan dasbor pemantauan kegiatan dinas bagi pimpinan dan admin
// untuk meninjau progres kegiatan seluruh pegawai serta melakukan verifikasi.
//
// Isi berkas:
//   - getRingkasan : memanggil API backend GET /pantau/ringkasan
//   - kolom        : konfigurasi kolom tabel kegiatan (judul, pegawai, aksi)
//   - KartuStatus  : kartu ringkasan status yang dapat diklik sebagai penyaring
//   - PantauView   : komponen utama halaman pemantauan pimpinan
//
// Cara kerja:
//   1. Memeriksa peran pengguna; jika peran PEGAWAI, tampilkan pesan tanpa akses.
//   2. Mengambil ringkasan statistik (total, belum diperiksa, perlu perbaikan,
//      sudah diperiksa, dan draf) serta daftar kegiatan terbaru via TanStack Query.
//   3. Menyaring daftar pilihan pegawai berdasarkan bidang; pegawai dipilih lewat PilihCari
//      (ketik nama) agar tetap bisa dipakai saat pegawai berjumlah ratusan.
//   3b. Kolom Cari mencari judul, lokasi, uraian, dan nama pegawai; kartu ringkasan ikut tersaring.
//   4. Memungkinkan pimpinan menyaring status langsung dari kartu statistik.
//   5. Menyediakan aksi cepat untuk menandai kegiatan langsung pada baris tabel.
//
// Catatan penting:
//   - Mengacu pada dokumen spesifikasi features/06-pantau-pimpinan.md.
//   - Akses dibatasi hanya untuk pimpinan dan admin; backend menolak dengan 403
//     jika diakses oleh pengguna selain hak akses tersebut.
//   - Kartu ringkasan dan tabel menggunakan parameter penyaring yang sama dari
//     backend sehingga data selalu sinkron.
//   - Cache query kegiatan otomatis diperbarui saat pimpinan melakukan verifikasi.
//
// Dipakai oleh: frontend/src/app/(app)/pantau/page.tsx
// =============================================================================

"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { CheckCheck, ClipboardList, MessageSquareWarning, RotateCcw, SearchX, Send } from "lucide-react";
import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { AvatarInisial } from "@/components/shared/avatar-inisial";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { KolomCari } from "@/components/shared/kolom-cari";
import { PageHeader } from "@/components/shared/page-header";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { PilihCari, type OpsiCari } from "@/components/shared/pilih-cari";
import { Panel, PanelFooter } from "@/components/shared/panel";
import { RentangTanggalPicker } from "@/components/shared/rentang-tanggal-picker";
import { StatusPemeriksaanBadge } from "@/components/shared/status-badge";
import { UnitChip } from "@/components/shared/unit-chip";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import { useGrupNav } from "@/hooks/use-grup-nav";
import { getDaftarKegiatan, UKURAN_HALAMAN } from "@/features/kegiatan/api/kegiatan";
import { PeriksaAksi } from "@/features/kegiatan/components/periksa-aksi";
import { KegiatanTanpaAkses } from "@/features/kegiatan/components/kegiatan-states";
import { useReferensi } from "@/features/kegiatan/hooks/use-kegiatan";
import type { FilterKegiatan, KegiatanItem, StatusPemeriksaanKegiatan } from "@/features/kegiatan/types";
import { apiClient } from "@/lib/api-client";
import { formatAngka, formatRentangTanggal } from "@/lib/format";
import { cn } from "@/lib/utils";

type Ringkasan = { total: number; draf: number; terkirim: number; diperiksa: number; perluPerbaikan: number };
type Penyaring = { q: string; unit: string | null; pegawai: string | null; dari: string | null; sampai: string | null };

const SEMUA = "semua";
const KOSONG: Penyaring = { q: "", unit: null, pegawai: null, dari: null, sampai: null };

async function getRingkasan(p: Penyaring) {
  const params = Object.fromEntries(Object.entries(p).filter(([, v]) => v));
  const { data } = await apiClient.get<Ringkasan>("/pantau/ringkasan", { params });
  return data;
}

const kolom: DataTableColumn<KegiatanItem>[] = [
  {
    id: "judul",
    header: "Kegiatan",
    cell: ({ row }) => (
      <div className="flex max-w-72 min-w-48 flex-col gap-0.5 whitespace-normal">
        <Link href={`/kegiatan/${row.original.id}`} className="font-semibold hover:text-primary hover:underline">
          {row.original.judul}
        </Link>
        <span className="text-xs text-muted-foreground">{row.original.jenis.nama}</span>
      </div>
    ),
  },
  {
    id: "pegawai",
    header: "Pegawai",
    cell: ({ row }) => (
      <span className="flex items-center gap-2">
        <AvatarInisial nama={row.original.penanggungJawab.nama} className="size-7" />
        {row.original.penanggungJawab.nama}
      </span>
    ),
  },
  { id: "bidang", header: "Bidang", cell: ({ row }) => <UnitChip className="max-w-44 whitespace-normal">{row.original.bidang.nama}</UnitChip> },
  {
    id: "tanggal",
    header: "Tanggal",
    cell: ({ row }) => <span className="whitespace-nowrap tabular-nums">{formatRentangTanggal(row.original.tglMulai, row.original.tglSelesai)}</span>,
  },
  { id: "status", header: "Status", cell: ({ row }) => <StatusPemeriksaanBadge status={row.original.statusPemeriksaan} /> },
  {
    id: "aksi",
    header: () => <span className="sr-only">Aksi</span>,
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-2">
        <PeriksaAksi kegiatan={row.original} ringkas />
      </div>
    ),
  },
];

// HP: satu kartu per kegiatan; status dan tombol periksa langsung terlihat tanpa menggeser tabel
function KartuPemeriksaan({ k }: { k: KegiatanItem }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/kegiatan/${k.id}`} className="min-w-0 rounded font-semibold [overflow-wrap:anywhere] hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          {k.judul}
        </Link>
        <StatusPemeriksaanBadge status={k.statusPemeriksaan} className="shrink-0" />
      </div>
      <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
        <span>
          {k.jenis.nama} · {formatRentangTanggal(k.tglMulai, k.tglSelesai)}
        </span>
        <span>
          {k.penanggungJawab.nama} · {k.bidang.nama}
        </span>
      </div>
      <PeriksaAksi kegiatan={k} className="[&>button]:flex-1" />
    </div>
  );
}

function KartuStatus({
  label,
  nilai,
  ikon: Ikon,
  aktif,
  onPilih,
  keterangan,
}: {
  label: string;
  nilai: number | undefined;
  ikon: typeof Send;
  aktif?: boolean;
  onPilih?: () => void;
  keterangan?: string;
}) {
  const isi = (
    <>
      <span className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <Ikon aria-hidden className="size-4" />
        {label}
      </span>
      {nilai == null ? <Skeleton className="h-8 w-16" /> : <span className="font-heading text-2xl font-extrabold tabular-nums">{formatAngka(nilai)}</span>}
      {keterangan && <span className="text-xs text-muted-foreground">{keterangan}</span>}
    </>
  );
  const kelas = "flex flex-col items-start gap-1 rounded-xl border bg-card p-4 text-left shadow-sm";
  return onPilih ? (
    <button
      type="button"
      onClick={onPilih}
      aria-pressed={aktif}
      className={cn(kelas, "transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none", aktif && "border-primary ring-1 ring-primary")}
    >
      {isi}
    </button>
  ) : (
    <div className={kelas}>{isi}</div>
  );
}

export function PantauView() {
  const id = useId();
  const { user } = useCurrentUser();
  // Nama halaman mengikuti menu: "Pemeriksaan kegiatan" untuk pimpinan, "Pantau" untuk admin
  const judulHalaman = user?.role === "PIMPINAN" ? "Pemeriksaan kegiatan" : "Pantau";
  const grupNav = useGrupNav("Pengawasan");
  const referensi = useReferensi();
  const [penyaring, setPenyaring] = useState<Penyaring>(KOSONG);
  const [status, setStatus] = useState<StatusPemeriksaanKegiatan | null>(null);
  const [page, setPage] = useState(1);

  const ubah = (u: Partial<Penyaring>) => {
    setPenyaring((p) => ({ ...p, ...u }));
    setPage(1);
  };
  const pilihStatus = (s: StatusPemeriksaanKegiatan) => {
    setStatus((lama) => (lama === s ? null : s));
    setPage(1);
  };
  const reset = () => {
    setPenyaring(KOSONG);
    setStatus(null);
    setPage(1);
  };
  const adaPenyaring = status != null || Object.values(penyaring).some(Boolean);

  const ringkasan = useQuery({ queryKey: ["pantau", "ringkasan", penyaring], queryFn: () => getRingkasan(penyaring), placeholderData: keepPreviousData });
  const filter = useMemo<FilterKegiatan>(
    () => ({ jenis: null, status: null, milik: null, ...penyaring, pemeriksaan: status, page }),
    [penyaring, status, page],
  );
  const daftar = useQuery({ queryKey: ["kegiatan", "pantau", filter], queryFn: () => getDaftarKegiatan(filter), placeholderData: keepPreviousData });

  const bidang = useMemo(() => referensi.data?.bidang ?? [], [referensi.data]);
  const pegawaiPilihan = useMemo(() => {
    if (!penyaring.unit) return referensi.data?.pegawai ?? [];
    const ids = new Set([Number(penyaring.unit)]);
    for (let tambah = true; tambah; ) {
      tambah = false;
      for (const u of bidang) {
        if (u.parentId != null && ids.has(u.parentId) && !ids.has(u.id)) {
          ids.add(u.id);
          tambah = true;
        }
      }
    }
    return (referensi.data?.pegawai ?? []).filter((p) => ids.has(p.bidangId));
  }, [penyaring.unit, referensi.data, bidang]);
  // Bidang ikut ditampilkan dan dicari: membedakan pegawai bernama sama dan memudahkan mencari per bidang
  const opsiPegawai = useMemo<OpsiCari[]>(() => {
    const namaUnit = new Map(bidang.map((u) => [u.id, u.nama]));
    return pegawaiPilihan.map((p) => ({ nilai: String(p.id), label: p.nama, keterangan: namaUnit.get(p.bidangId) ?? "" }));
  }, [pegawaiPilihan, bidang]);

  if (user && user.role !== "PIMPINAN" && user.role !== "ADMIN") {
    return (
      <>
        <PageHeader eyebrow={grupNav} title={judulHalaman} />
        <KegiatanTanpaAkses pesan="Halaman ini untuk pimpinan dan admin. Kegiatan Anda tersedia di daftar Kegiatan." />
      </>
    );
  }

  const r = ringkasan.data;
  const label = "text-xs font-bold text-foreground/80";

  return (
    <>
      <PageHeader eyebrow={grupNav} title={judulHalaman} />

      <Panel>
        <div role="search" aria-label="Penyaring pantau" className="grid items-end gap-3 p-4 sm:grid-cols-2 md:p-5 lg:grid-cols-[1fr_1fr_minmax(14rem,1.2fr)_auto]">
          <div className="flex min-w-0 flex-col gap-1.5 sm:col-span-2 lg:col-span-4">
            <label htmlFor={`${id}-cari`} className={label}>
              Cari
            </label>
            <KolomCari
              id={`${id}-cari`}
              value={penyaring.q}
              onChange={(q) => ubah({ q })}
              placeholder="Judul kegiatan, lokasi, atau nama pegawai..."
              label="Cari kegiatan atau pegawai"
            />
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor={`${id}-unit`} className={label}>
              Bidang
            </label>
            <Select value={penyaring.unit ?? SEMUA} onValueChange={(v) => ubah({ unit: v === SEMUA ? null : v, pegawai: null })}>
              <SelectTrigger id={`${id}-unit`} className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SEMUA}>Semua bidang</SelectItem>
                {bidang.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)} className={cn(u.parentId != null && "pl-6 text-muted-foreground")}>
                    {u.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor={`${id}-pegawai`} className={label}>
              Pegawai
            </label>
            <PilihCari
              id={`${id}-pegawai`}
              value={penyaring.pegawai}
              onChange={(v) => ubah({ pegawai: v })}
              opsi={opsiPegawai}
              labelSemua={penyaring.unit ? "Semua pegawai di bidang ini" : "Semua pegawai"}
              placeholderCari="Ketik nama atau bidang..."
            />
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor={`${id}-tanggal`} className={label}>
              Tanggal
            </label>
            <RentangTanggalPicker id={`${id}-tanggal`} value={penyaring} onChange={ubah} />
          </div>
          <Button variant="outline" className="h-10 pointer-coarse:min-h-11" onClick={reset} disabled={!adaPenyaring}>
            <RotateCcw aria-hidden />
            Tampilkan semua
          </Button>
        </div>
      </Panel>

      {ringkasan.isError ? (
        <ErrorState message={ringkasan.error.message} onRetry={() => ringkasan.refetch()} retrying={ringkasan.isRefetching} />
      ) : (
        <div className={cn("grid grid-cols-2 gap-3 md:grid-cols-4", ringkasan.isPlaceholderData && "opacity-60")}>
          <KartuStatus label="Total kegiatan" nilai={r?.total} ikon={ClipboardList} keterangan="Sudah dicatat" />
          <KartuStatus label="Belum diperiksa" nilai={r?.terkirim} ikon={Send} aktif={status === "terkirim"} onPilih={() => pilihStatus("terkirim")} />
          <KartuStatus label="Perlu perbaikan" nilai={r?.perluPerbaikan} ikon={MessageSquareWarning} aktif={status === "perlu_perbaikan"} onPilih={() => pilihStatus("perlu_perbaikan")} />
          <KartuStatus label="Sudah diperiksa" nilai={r?.diperiksa} ikon={CheckCheck} aktif={status === "diperiksa"} onPilih={() => pilihStatus("diperiksa")} />
        </div>
      )}

      <Panel>
        {daftar.isError ? (
          <div className="p-4">
            <ErrorState message={daftar.error.message} onRetry={() => daftar.refetch()} retrying={daftar.isRefetching} />
          </div>
        ) : (
          <>
            <DataTable
              columns={kolom}
              data={daftar.data?.items ?? []}
              isLoading={daftar.isPending}
              bleed
              caption="Kegiatan terbaru seluruh pegawai"
              getRowKey={(k) => String(k.id)}
              renderMobileCard={(k) => <KartuPemeriksaan k={k} />}
              className={cn("transition-opacity", daftar.isPlaceholderData && "opacity-60")}
              empty={
                adaPenyaring
                  ? { icon: SearchX, title: "Tidak ada kegiatan yang cocok.", action: <Button variant="outline" className="h-10" onClick={reset}>Tampilkan semua</Button> }
                  : { icon: ClipboardList, title: "Belum ada kegiatan tim." }
              }
            />
            {daftar.data && daftar.data.total > 0 && (
              <PanelFooter>
                <PaginationBar className="w-full" page={daftar.data.page} pageSize={UKURAN_HALAMAN} total={daftar.data.total} onPageChange={setPage} />
              </PanelFooter>
            )}
          </>
        )}
      </Panel>
    </>
  );
}
