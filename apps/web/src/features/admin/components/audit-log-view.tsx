"use client";

import { Eye, RotateCcw, ScrollText, SearchX } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { DatePicker } from "@/components/shared/date-picker";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { PilihCari } from "@/components/shared/pilih-cari";
import { Panel, PanelFooter } from "@/components/shared/panel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTanggalJam } from "@/lib/format";
import { cn } from "@/lib/utils";
import { UKURAN_HALAMAN_AUDIT } from "../api/admin";
import { useAuditDetail, useAuditLog, usePilihanAudit } from "../hooks/use-admin";
import type { AuditItem, FilterAudit } from "../types";
import { AdminGuard } from "./admin-shared";

// Daftar audit log: login, perubahan kegiatan, unggahan, dan master data

const SEMUA = "semua";

const LABEL_AKSI: Record<string, string> = {
  login: "Login",
  login_gagal: "Login gagal",
  akun_terkunci: "Akun terkunci",
  logout: "Logout",
  buat: "Buat",
  ubah: "Ubah",
  hapus: "Hapus",
  batal: "Batalkan",
  unggah: "Unggah berkas",
  hapus_file: "Hapus berkas",
  ganti_file: "Ganti berkas",
  periksa: "Periksa kegiatan",
  ekspor: "Ekspor",
  aktifkan: "Aktifkan",
  nonaktifkan: "Nonaktifkan",
  reset_sandi: "Atur ulang sandi",
  undang: "Kirim undangan",
  aktivasi: "Aktivasi akun",
  minta_akun: "Minta akun",
  setujui: "Setujui",
  tolak: "Tolak",
  minta_reset_sandi: "Minta atur ulang sandi",
  kirim_reset_sandi: "Kirim tautan atur ulang sandi",
  ganti_sandi: "Ganti sandi",
  minta_ganti_email: "Minta ganti email",
  ganti_email: "Ganti email",
  batal_ganti_email: "Batal ganti email",
  cabut_sesi: "Keluarkan sesi",
  migrasi: "Migrasi data",
};

const LABEL_ENTITAS: Record<string, string> = {
  kegiatan: "Kegiatan",
  dokumentasi: "Dokumentasi",
  user: "Akun",
  bidang: "Bidang",
  jenis_unit: "Jenis unit", // tabel sudah dihapus; label untuk baris audit lama
  pegawai: "Pegawai",
  jenis_kegiatan: "Jenis kegiatan",
  permintaan_akun: "Permintaan akun",
};

const AKSI_PERINGATAN = new Set(["login_gagal", "akun_terkunci", "hapus", "hapus_file", "nonaktifkan", "reset_sandi", "kirim_reset_sandi", "cabut_sesi", "tolak"]);
const AKSI_BARU = new Set(["buat", "unggah", "aktifkan", "aktivasi", "setujui"]);
const AKSI_AKSES = new Set(["login", "logout", "ekspor", "minta_akun", "minta_reset_sandi"]);

function kelasAksi(aksi: string) {
  if (AKSI_PERINGATAN.has(aksi)) return "bg-status-dibatalkan text-status-dibatalkan-foreground";
  if (AKSI_BARU.has(aksi)) return "bg-status-selesai text-status-selesai-foreground";
  if (AKSI_AKSES.has(aksi)) return "bg-muted text-muted-foreground";
  return "bg-secondary text-primary";
}

export const labelAksi = (a: string) => LABEL_AKSI[a] ?? a;
export const labelEntitas = (e: string) => LABEL_ENTITAS[e] ?? e;

export function ChipAksi({ aksi }: { aksi: string }) {
  return (
    <span
      className={cn("rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap", kelasAksi(aksi))}
    >
      {labelAksi(aksi)}
    </span>
  );
}

function BlokJson({ judul, nilai }: { judul: string; nilai: unknown }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <p className="text-xs font-bold text-foreground/80">{judul}</p>
      {nilai == null ? (
        <p className="rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">Tidak ada</p>
      ) : (
        <pre className="max-h-80 overflow-auto rounded-lg bg-muted p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap break-all">
          {JSON.stringify(nilai, null, 2)}
        </pre>
      )}
    </div>
  );
}

function DetailDialog({ id, onClose }: { id: number; onClose: () => void }) {
  const detail = useAuditDetail(id);
  const d = detail.data;
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Catatan audit #{id}</DialogTitle>
          <DialogDescription>
            {d
              ? `${labelAksi(d.aksi)} ${labelEntitas(d.entitas).toLowerCase()}${d.entitasId ? ` #${d.entitasId}` : ""} oleh ${d.aktor?.nama ?? "sistem atau pengguna tak dikenal"}, ${formatTanggalJam(d.waktu)}`
              : "Memuat rincian..."}
          </DialogDescription>
        </DialogHeader>
        {detail.isError ? (
          <ErrorState message={detail.error.message} onRetry={() => detail.refetch()} retrying={detail.isRefetching} />
        ) : !d ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <BlokJson judul="Sebelum" nilai={d.dataSebelum} />
              <BlokJson judul="Sesudah" nilai={d.dataSesudah} />
            </div>
            <dl className="grid gap-x-4 gap-y-1 text-xs sm:grid-cols-[6rem_1fr]">
              <dt className="font-bold text-foreground/80">Alamat IP</dt>
              <dd className="text-muted-foreground tabular-nums">{d.ip ?? "Tidak tercatat"}</dd>
              <dt className="font-bold text-foreground/80">Perangkat</dt>
              <dd className="break-all text-muted-foreground">{d.userAgent ?? "Tidak tercatat"}</dd>
            </dl>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

const FILTER_AWAL: FilterAudit = { aktor: null, aksi: null, entitas: null, dari: null, sampai: null, page: 1 };

function DaftarAudit() {
  const [filter, setFilterState] = useState<FilterAudit>(FILTER_AWAL);
  const setFilter = useCallback((ubah: Partial<FilterAudit>) => setFilterState((f) => ({ ...f, page: 1, ...ubah })), []);
  const daftar = useAuditLog(filter);
  const pilihan = usePilihanAudit();
  const [dibuka, setDibuka] = useState<number | null>(null);
  const adaFilter = Object.entries(filter).some(([k, v]) => k !== "page" && v !== null);

  const kolom = useMemo<DataTableColumn<AuditItem>[]>(
    () => [
      { id: "waktu", header: "Waktu (WIB)", cell: ({ row }) => <span className="whitespace-nowrap tabular-nums">{formatTanggalJam(row.original.waktu)}</span> },
      {
        id: "aktor",
        header: "Aktor",
        cell: ({ row }) =>
          row.original.aktor ? (
            <span className="flex max-w-56 flex-col whitespace-normal">
              <span className="font-medium">{row.original.aktor.nama}</span>
              {row.original.aktor.email && <span className="truncate text-xs text-muted-foreground">{row.original.aktor.email}</span>}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Tidak dikenal</span>
          ),
      },
      { id: "aksi", header: "Aksi", cell: ({ row }) => <ChipAksi aksi={row.original.aksi} /> },
      {
        id: "entitas",
        header: "Entitas",
        cell: ({ row }) => (
          <span>
            {labelEntitas(row.original.entitas)}
            {row.original.entitasId && <span className="text-xs text-muted-foreground"> #{row.original.entitasId.slice(0, 8)}</span>}
          </span>
        ),
      },
      { id: "ip", header: "IP", cell: ({ row }) => <span className="text-xs text-muted-foreground tabular-nums">{row.original.ip ?? "–"}</span> },
      {
        id: "detail",
        header: () => <span className="sr-only">Rincian</span>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="icon"
              className="size-9 text-muted-foreground"
              aria-label={`Lihat rincian catatan #${row.original.id}`}
              onClick={() => setDibuka(row.original.id)}
            >
              <Eye />
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  const label = "text-xs font-bold text-foreground/80";

  return (
    <Panel>
      <div role="search" aria-label="Filter audit log" className="grid grid-cols-2 items-end gap-3 border-b border-muted p-4 sm:grid-cols-3 md:p-5 xl:grid-cols-[repeat(5,minmax(8rem,1fr))_auto]">
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="audit-aktor" className={label}>
            Aktor
          </label>
          <PilihCari
            id="audit-aktor"
            value={filter.aktor}
            onChange={(v) => setFilter({ aktor: v })}
            opsi={(pilihan.data?.aktor ?? []).map((a) => ({ nilai: a.id, label: a.nama, keterangan: a.email }))}
            labelSemua="Semua aktor"
            placeholderCari="Ketik nama atau email..."
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="audit-aksi" className={label}>
            Aksi
          </label>
          <Select value={filter.aksi ?? SEMUA} onValueChange={(v) => setFilter({ aksi: v === SEMUA ? null : v })}>
            <SelectTrigger id="audit-aksi" className="h-10 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SEMUA}>Semua aksi</SelectItem>
              {(pilihan.data?.aksi ?? []).map((a) => (
                <SelectItem key={a} value={a}>
                  {labelAksi(a)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="audit-entitas" className={label}>
            Entitas
          </label>
          <Select value={filter.entitas ?? SEMUA} onValueChange={(v) => setFilter({ entitas: v === SEMUA ? null : v })}>
            <SelectTrigger id="audit-entitas" className="h-10 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SEMUA}>Semua entitas</SelectItem>
              {(pilihan.data?.entitas ?? []).map((e) => (
                <SelectItem key={e} value={e}>
                  {labelEntitas(e)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="audit-dari" className={label}>
            Dari tanggal
          </label>
          <DatePicker id="audit-dari" value={filter.dari ?? ""} onChange={(v) => setFilter({ dari: v || null })} placeholder="Awal" />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="audit-sampai" className={label}>
            Sampai tanggal
          </label>
          <DatePicker id="audit-sampai" value={filter.sampai ?? ""} onChange={(v) => setFilter({ sampai: v || null })} placeholder="Akhir" />
        </div>
        <Button variant="outline" className="h-10" onClick={() => setFilterState(FILTER_AWAL)} disabled={!adaFilter}>
          <RotateCcw aria-hidden />
          Atur ulang
        </Button>
      </div>

      {daftar.isError ? (
        <div className="p-4 md:p-5">
          <ErrorState message={daftar.error.message} onRetry={() => daftar.refetch()} retrying={daftar.isRefetching} />
        </div>
      ) : (
        <>
          <DataTable
            columns={kolom}
            data={daftar.data?.items ?? []}
            isLoading={daftar.isPending}
            skeletonRows={10}
            bleed
            caption="Audit log"
            getRowKey={(a) => String(a.id)}
            className={cn("transition-opacity duration-150", daftar.isPlaceholderData && "opacity-60")}
            empty={adaFilter ? { icon: SearchX, title: "Tidak ada catatan yang cocok.", description: "Coba ubah filter atau rentang tanggal." } : { icon: ScrollText, title: "Belum ada catatan audit." }}
          />
          {daftar.data && daftar.data.total > 0 && (
            <PanelFooter>
              <PaginationBar
                className="w-full"
                satuan="catatan"
                page={daftar.data.page}
                pageSize={UKURAN_HALAMAN_AUDIT}
                total={daftar.data.total}
                onPageChange={(page) => setFilterState((f) => ({ ...f, page }))}
              />
            </PanelFooter>
          )}
        </>
      )}

      {dibuka != null && <DetailDialog id={dibuka} onClose={() => setDibuka(null)} />}
    </Panel>
  );
}

export function AuditLogView() {
  return (
    <>
      <PageHeader
        eyebrow="Administrasi"
        title="Audit log"
      />
      <AdminGuard>
        <DaftarAudit />
      </AdminGuard>
    </>
  );
}
