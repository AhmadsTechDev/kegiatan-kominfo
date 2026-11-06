"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronRight, ClipboardList, FileClock, RotateCcw, SearchX } from "lucide-react";
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
import { StatusBadge, StatusPemeriksaanBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import { useGrupNav } from "@/hooks/use-grup-nav";
import { idTab, PilihanTab } from "@/features/admin/components/admin-shared";
import { getDaftarKegiatan, UKURAN_HALAMAN } from "@/features/kegiatan/api/kegiatan";
import { PeriksaAksi } from "@/features/kegiatan/components/periksa-aksi";
import { KegiatanTanpaAkses } from "@/features/kegiatan/components/kegiatan-states";
import { useReferensi } from "@/features/kegiatan/hooks/use-kegiatan";
import type { FilterKegiatan, KegiatanItem, StatusPemeriksaanKegiatan } from "@/features/kegiatan/types";
import { apiClient } from "@/lib/api-client";
import { formatAngka, formatJam, formatRentangTanggal } from "@/lib/format";
import { cn } from "@/lib/utils";

// Pemantauan kegiatan seluruh pegawai untuk pimpinan dan admin, termasuk pemeriksaan

type Ringkasan = { total: number; draf: number; perluPerbaikan: number };
type Penyaring = { q: string; unit: string | null; pegawai: string | null; dari: string | null; sampai: string | null };

const SEMUA = "semua";
const KOSONG: Penyaring = { q: "", unit: null, pegawai: null, dari: null, sampai: null };

async function getRingkasan(p: Penyaring) {
  const params = Object.fromEntries(Object.entries(p).filter(([, v]) => v));
  const { data } = await apiClient.get<Ringkasan>("/pantau/ringkasan", { params });
  return data;
}

type Tampilan = "semua" | "perlu_perbaikan";

const ID_PANEL = "panel-pantau";

function TombolDetail({ k, className }: { k: KegiatanItem; className?: string }) {
  return (
    <Button asChild variant="outline" size="sm" className={cn("h-8 gap-1 px-3 text-xs pointer-coarse:h-11", className)}>
      <Link href={`/kegiatan/${k.id}`} aria-label={`Detail ${k.judul}`}>
        Detail
        <ChevronRight aria-hidden className="size-3.5" />
      </Link>
    </Button>
  );
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
      <span className="flex min-w-40 items-center gap-2">
        <AvatarInisial nama={row.original.penanggungJawab.nama} className="size-7" />
        <span className="flex min-w-0 flex-col">
          {row.original.penanggungJawab.nama}
          <span className="line-clamp-1 max-w-48 text-xs whitespace-normal text-muted-foreground" title={row.original.bidang.nama}>
            {row.original.bidang.nama}
          </span>
        </span>
      </span>
    ),
  },
  {
    id: "tanggal",
    header: "Tanggal",
    cell: ({ row }) => (
      <span className="whitespace-nowrap tabular-nums">
        {formatRentangTanggal(row.original.tglMulai, row.original.tglSelesai)}
        <span className="block text-xs text-muted-foreground">{formatJam(row.original.tglMulai)}</span>
      </span>
    ),
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => (
      <div className="flex flex-col items-start gap-1">
        <StatusBadge status={row.original.statusPelaksanaan} />
        <StatusPemeriksaanBadge status={row.original.statusPemeriksaan} />
      </div>
    ),
  },
  {
    id: "aksi",
    header: () => <span className="sr-only">Aksi</span>,
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-2">
        <PeriksaAksi kegiatan={row.original} ringkas />
        <TombolDetail k={row.original} />
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
        <StatusBadge status={k.statusPelaksanaan} className="shrink-0" />
      </div>
      <StatusPemeriksaanBadge status={k.statusPemeriksaan} className="w-fit" />
      <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
        <span>
          {k.jenis.nama} · {formatRentangTanggal(k.tglMulai, k.tglSelesai)}
        </span>
        <span>
          {k.penanggungJawab.nama} · {k.bidang.nama}
        </span>
      </div>
      <div className="flex gap-2">
        <PeriksaAksi kegiatan={k} className="flex-1 [&>button]:flex-1" />
        <TombolDetail k={k} className="h-10 flex-1 text-sm" />
      </div>
    </div>
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
  const [tampilan, setTampilan] = useState<Tampilan>("semua");
  const [page, setPage] = useState(1);

  const ubah = (u: Partial<Penyaring>) => {
    setPenyaring((p) => ({ ...p, ...u }));
    setPage(1);
  };
  const pilihTampilan = (t: Tampilan) => {
    setTampilan(t);
    setPage(1);
  };
  const reset = () => {
    setPenyaring(KOSONG);
    setPage(1);
  };
  const adaPenyaring = Object.values(penyaring).some(Boolean);
  const status: StatusPemeriksaanKegiatan | null = tampilan === "semua" ? null : tampilan;

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
        <div role="search" aria-label="Penyaring pantau" className="grid items-end gap-3 p-4 sm:grid-cols-2 md:p-5 xl:grid-cols-[minmax(16rem,1.4fr)_1fr_1fr_minmax(14rem,1fr)_auto]">
          <div className="flex min-w-0 flex-col gap-1.5 sm:col-span-2 xl:col-span-1">
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
            Atur ulang
          </Button>
        </div>
      </Panel>

      <Panel>
        <div className={cn("flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-muted px-4 pt-4 pb-3 md:px-5", ringkasan.isPlaceholderData && "opacity-60")}>
          <PilihanTab
            label="Tampilan pemantauan"
            idPanel={ID_PANEL}
            value={tampilan}
            onChange={pilihTampilan}
            opsi={[
              { nilai: "semua", label: "Semua kegiatan", jumlah: r?.total },
              { nilai: "perlu_perbaikan", label: "Perlu perbaikan", lencana: r?.perluPerbaikan },
            ]}
          />
          {ringkasan.isError ? (
            <Button variant="ghost" size="sm" className="h-9 text-xs text-destructive" onClick={() => ringkasan.refetch()}>
              Ringkasan gagal dimuat. Coba lagi
            </Button>
          ) : (
            !!r?.draf && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <FileClock aria-hidden className="size-3.5" />
                <span>
                  <span className="font-semibold text-foreground tabular-nums">{formatAngka(r.draf)}</span> draf belum dikirim pegawai
                </span>
              </p>
            )
          )}
        </div>
        <div role="tabpanel" id={ID_PANEL} aria-labelledby={idTab(ID_PANEL, tampilan)}>
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
                    ? { icon: SearchX, title: "Tidak ada kegiatan yang cocok dengan penyaring.", action: <Button variant="outline" className="h-10" onClick={reset}>Atur ulang penyaring</Button> }
                    : tampilan === "perlu_perbaikan"
                      ? { icon: ClipboardList, title: "Tidak ada kegiatan yang menunggu perbaikan.", description: "Kegiatan yang ditandai perlu perbaikan muncul di sini sampai pencatat mengubahnya." }
                      : { icon: ClipboardList, title: "Belum ada kegiatan tim yang dikirim." }
                }
              />
              {daftar.data && daftar.data.total > 0 && (
                <PanelFooter>
                  <PaginationBar className="w-full" page={daftar.data.page} pageSize={UKURAN_HALAMAN} total={daftar.data.total} onPageChange={setPage} />
                </PanelFooter>
              )}
            </>
          )}
        </div>
      </Panel>
    </>
  );
}
