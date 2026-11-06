"use client";

import {
  ChevronRight,
  ClipboardList,
  Images,
  Plus,
  SearchX,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AvatarInisial } from "@/components/shared/avatar-inisial";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/shared/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { FilterBar } from "@/components/shared/filter-bar";
import { PageHeader } from "@/components/shared/page-header";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { Panel, PanelFooter } from "@/components/shared/panel";
import {
  StatusBadge,
  StatusPemeriksaanBadge,
} from "@/components/shared/status-badge";
import { UnitChip } from "@/components/shared/unit-chip";
import { Button } from "@/components/ui/button";
import { useGrupNav } from "@/hooks/use-grup-nav";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import { useLingkupPegawai } from "@/features/auth/hooks/use-lingkup";
import { formatJam, formatRentangTanggal } from "@/lib/format";
import { cn } from "@/lib/utils";
import { UKURAN_HALAMAN } from "../api/kegiatan";
import { useDaftarKegiatan, useReferensi } from "../hooks/use-kegiatan";
import { useKegiatanFilter } from "../hooks/use-kegiatan-filter";
import type { FilterKegiatan, KegiatanItem } from "../types";
import { DrafSaya } from "./draf-saya";
import { KegiatanDokumentasiSheet } from "./kegiatan-dokumentasi-sheet";

// Daftar kegiatan dengan filter, paginasi, tabel di desktop, dan kartu di ponsel

type Lingkup = "semua" | "unit" | "saya" | "perbaikan";

type BukaDokumentasi = (k: KegiatanItem) => void;

// Tombol Dokumentasi: membuka panel dokumentasi dan hasil tanpa meninggalkan daftar
function TombolDokumentasi({
  k,
  onBuka,
  className,
}: {
  k: KegiatanItem;
  onBuka: BukaDokumentasi;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn("h-8 gap-1 px-3 text-xs pointer-coarse:h-11", className)}
      onClick={() => onBuka(k)}
      aria-label={`Dokumentasi ${k.judul}`}
    >
      <Images aria-hidden className="size-3.5" />
      Dokumentasi
    </Button>
  );
}

function buatKolom({
  tanpaPj,
  onDokumentasi,
}: {
  tanpaPj: boolean;
  onDokumentasi: BukaDokumentasi;
}): DataTableColumn<KegiatanItem>[] {
  const kolom: DataTableColumn<KegiatanItem>[] = [
    {
      id: "judul",
      header: "Kegiatan",
      cell: ({ row }) => (
        <div className="flex max-w-80 min-w-52 flex-col gap-0.5 whitespace-normal">
          <Link
            href={`/kegiatan/${row.original.id}`}
            className="font-semibold text-foreground hover:text-primary hover:underline"
          >
            {row.original.judul}
          </Link>
          <span className="text-xs text-muted-foreground">
            {row.original.jenis.nama}
            {row.original.lokasiNama && ` · ${row.original.lokasiNama}`}
          </span>
        </div>
      ),
    },
    {
      id: "bidang",
      header: "Bidang",
      cell: ({ row }) => (
        <UnitChip className="max-w-48 min-w-32 whitespace-normal">
          {row.original.bidang.nama}
        </UnitChip>
      ),
    },
    {
      id: "tanggal",
      header: "Tanggal",
      cell: ({ row }) => (
        <span className="whitespace-nowrap tabular-nums">
          {formatRentangTanggal(row.original.tglMulai, row.original.tglSelesai)}
          <span className="block text-xs text-muted-foreground">
            {formatJam(row.original.tglMulai)}
          </span>
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
      id: "pj",
      header: "Penanggung jawab",
      cell: ({ row }) => (
        <span className="flex items-center gap-2">
          <AvatarInisial
            nama={row.original.penanggungJawab.nama}
            className="size-7"
          />
          {row.original.penanggungJawab.nama}
        </span>
      ),
    },
    {
      id: "aksi",
      header: () => <span className="sr-only">Aksi</span>,
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <TombolDokumentasi k={row.original} onBuka={onDokumentasi} />
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-8 gap-1 px-3 text-xs"
          >
            <Link
              href={`/kegiatan/${row.original.id}`}
              aria-label={`Detail ${row.original.judul}`}
            >
              Detail
              <ChevronRight aria-hidden className="size-3.5" />
            </Link>
          </Button>
        </div>
      ),
    },
  ];
  return tanpaPj ? kolom.filter((k) => k.id !== "pj") : kolom;
}

function KartuKegiatan({
  k,
  onDokumentasi,
}: {
  k: KegiatanItem;
  onDokumentasi: BukaDokumentasi;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border bg-card">
      <Link
        href={`/kegiatan/${k.id}`}
        className="flex items-center gap-2 p-3 transition-colors duration-120 ease-out hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-semibold">{k.judul}</span>
            <StatusBadge status={k.statusPelaksanaan} className="shrink-0" />
          </div>
          <span className="text-xs text-muted-foreground">
            {formatRentangTanggal(k.tglMulai, k.tglSelesai)} ·{" "}
            {formatJam(k.tglMulai)}
          </span>
          <span className="text-xs text-muted-foreground">
            {k.bidang.nama} · {k.penanggungJawab.nama}
          </span>
        </div>
        <ChevronRight
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground"
        />
      </Link>
      <div className="border-t border-muted px-3 py-2">
        <TombolDokumentasi k={k} onBuka={onDokumentasi} className="w-full" />
      </div>
    </div>
  );
}

type KosongTabel = React.ComponentProps<
  typeof DataTable<KegiatanItem>
>["empty"];

function TabelKegiatan({
  filter,
  kolom,
  caption,
  empty,
  onPageChange,
  satuan,
  header,
  onDokumentasi,
}: {
  filter: FilterKegiatan;
  kolom: DataTableColumn<KegiatanItem>[];
  caption: string;
  empty: KosongTabel;
  onPageChange: (page: number) => void;
  satuan?: string;
  header?: (total: number | null) => React.ReactNode;
  onDokumentasi: BukaDokumentasi;
}) {
  const daftar = useDaftarKegiatan(filter);
  return (
    <>
      {header?.(daftar.data?.total ?? null)}
      {daftar.isError ? (
        <div className="px-4 pb-4 md:px-5">
          <ErrorState
            message={daftar.error.message}
            onRetry={() => daftar.refetch()}
            retrying={daftar.isRefetching}
          />
        </div>
      ) : (
        <>
          <DataTable
            columns={kolom}
            data={daftar.data?.items ?? []}
            isLoading={daftar.isPending}
            skeletonRows={header ? 4 : 8}
            bleed
            caption={caption}
            getRowKey={(k) => String(k.id)}
            renderMobileCard={(k) => (
              <KartuKegiatan k={k} onDokumentasi={onDokumentasi} />
            )}
            className={cn(
              "transition-opacity duration-150",
              daftar.isPlaceholderData && "opacity-60",
            )}
            empty={empty}
          />
          {daftar.data && daftar.data.total > 0 && (
            <PanelFooter>
              <PaginationBar
                className="w-full"
                satuan={satuan}
                page={daftar.data.page}
                pageSize={UKURAN_HALAMAN}
                total={daftar.data.total}
                onPageChange={onPageChange}
              />
            </PanelFooter>
          )}
        </>
      )}
    </>
  );
}

export function KegiatanListView() {
  const { user } = useCurrentUser();
  const grupNav = useGrupNav("Operasional");
  const { filter, setFilter, resetFilter, adaFilter } = useKegiatanFilter();
  const { terbatas: pegawai, unit: unitSaya, saringUnit } = useLingkupPegawai();
  const lingkup: Lingkup = !pegawai
    ? "semua"
    : filter.milik === "saya" && filter.pemeriksaan === "perlu_perbaikan"
      ? "perbaikan"
      : filter.milik === "saya"
        ? "saya"
        : "unit";
  const judul: Record<Lingkup, { title: string; description?: string }> = {
    // Admin tetap "Kegiatan"; pimpinan memakai nama menu "Semua kegiatan"
    semua: { title: user?.role === "PIMPINAN" ? "Semua kegiatan" : "Kegiatan" },
    unit: {
      title: "Semua kegiatan",
      description: unitSaya ? `${unitSaya.nama} dan sub bidangnya` : undefined,
    },
    perbaikan: {
      title: "Perlu perbaikan",
    },
    saya: {
      title: "Kegiatan saya",
    },
  };
  const referensi = useReferensi();
  const tanpaPj = lingkup === "saya" || lingkup === "perbaikan";
  const [dokumentasi, setDokumentasi] = useState<{
    id: number;
    judul: string;
  } | null>(null);
  const kolom = useMemo(
    () =>
      buatKolom({
        tanpaPj,
        onDokumentasi: (k) => setDokumentasi({ id: k.id, judul: k.judul }),
      }),
    [tanpaPj],
  );

  const bisaMenambah = user?.role === "PEGAWAI";
  const tombolTambah = bisaMenambah && (
    <Button asChild className="h-10">
      <Link href="/kegiatan/baru">
        <Plus aria-hidden />
        Tambah kegiatan
      </Link>
    </Button>
  );

  const kosongFilter: KosongTabel = {
    icon: SearchX,
    title: "Tidak ada kegiatan yang cocok.",
    description: "Coba ubah filter atau kata kunci pencarian.",
    action: (
      <Button variant="outline" className="h-10" onClick={resetFilter}>
        Atur ulang filter
      </Button>
    ),
  };
  const keHalaman = (page: number) => {
    setFilter({ page });
    window.scrollTo({ top: 0 });
  };

  const filterBar = (
    <div className="border-b border-muted p-4 md:p-5">
      <FilterBar
        value={filter}
        onChange={setFilter}
        onReset={resetFilter}
        adaFilter={adaFilter}
        bidang={
          tanpaPj ? [] : saringUnit(referensi.data?.bidang ?? [])
        }
        jenisKegiatan={referensi.data?.jenisKegiatan ?? []}
      />
      {filter.pegawai && (
        <div className="mt-3 flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Penanggung jawab:</span>
          <span className="font-semibold">
            {referensi.data?.pegawai.find(
              (p) => String(p.id) === filter.pegawai,
            )?.nama ?? "Pegawai terpilih"}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setFilter({ pegawai: null })}
          >
            <X aria-hidden className="size-3.5" />
            Lepas
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <>
      <PageHeader
        eyebrow={grupNav}
        title={judul[lingkup].title}
        description={judul[lingkup].description}
        actions={tombolTambah}
      />

      {bisaMenambah && <DrafSaya />}

      <Panel>
        {filterBar}
        <TabelKegiatan
          filter={filter}
          kolom={kolom}
          caption="Daftar kegiatan"
          onPageChange={keHalaman}
          onDokumentasi={(k) => setDokumentasi({ id: k.id, judul: k.judul })}
          empty={
            [
              filter.q,
              filter.dari,
              filter.sampai,
              filter.unit,
              filter.jenis,
              filter.status,
              filter.pegawai,
            ].some(Boolean)
              ? kosongFilter
              : {
                  icon: ClipboardList,
                  title:
                    lingkup === "perbaikan"
                      ? "Tidak ada kegiatan yang perlu diperbaiki."
                      : lingkup === "saya"
                        ? "Belum ada kegiatan Anda."
                        : "Belum ada kegiatan.",
                  description: bisaMenambah && lingkup !== "perbaikan"
                    ? "Tambahkan kegiatan pertama."
                    : undefined,
                  action: lingkup === "perbaikan" ? undefined : tombolTambah || undefined,
                }
          }
        />
      </Panel>

      <KegiatanDokumentasiSheet
        target={dokumentasi}
        onClose={() => setDokumentasi(null)}
      />
    </>
  );
}
