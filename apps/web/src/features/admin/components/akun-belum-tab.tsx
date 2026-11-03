// =============================================================================
// TAB PEGAWAI YANG BELUM PUNYA AKUN
// =============================================================================
// Gunanya: Daftar pegawai aktif yang belum punya akun login, lengkap dengan tombol Undang
// untuk mengirim tautan pembuatan kata sandi ke email pribadi mereka.
//
// Isi berkas:
//   - FILTER_BELUM : filter tetap untuk pegawai aktif yang belum punya akun
//   - BelumPunyaAkun : tabel pegawai belum berakun dengan pencarian, paginasi, dialog ubah data, dan dialog undangan
//
// Catatan penting:
//   - Akun yang sudah diundang muncul di tab Akun dengan status Menunggu aktivasi, bukan di sini.
//
// Dipakai oleh: akun-view.tsx
// =============================================================================

"use client";

import { Send, UserCheck } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { PanelFooter } from "@/components/shared/panel";
import { UnitChip } from "@/components/shared/unit-chip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LABEL_ROLE } from "@/types/auth";
import { UKURAN_HALAMAN_ADMIN } from "../api/admin";
import { useBidangAdmin, usePegawaiAdmin, useUndangPegawai } from "../hooks/use-admin";
import type { FilterPegawai, PegawaiAdmin } from "../types";
import { KartuMaster, KolomCari, TombolUbah } from "./admin-shared";
import { PegawaiDialog } from "./pegawai-tab";
import { UndangDialog } from "./undang-dialog";

export const FILTER_BELUM: FilterPegawai = { q: "", unit: null, aktif: "1", akun: "tanpa", page: 1 };

// Role bawaan adalah Pegawai; hanya Pimpinan yang perlu ditandai
function LabelRole({ role }: { role: PegawaiAdmin["roleUndangan"] }) {
  if (role !== "PIMPINAN") return null;
  return <span className="mt-0.5 block text-xs font-normal text-muted-foreground">Akan diundang sebagai {LABEL_ROLE.PIMPINAN}</span>;
}

function TombolUndang({ p, onClick }: { p: PegawaiAdmin; onClick: () => void }) {
  return (
    <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs pointer-coarse:h-11" aria-label={`Undang ${p.nama}`} onClick={onClick}>
      <Send aria-hidden className="size-3.5" />
      Undang
    </Button>
  );
}

export function BelumPunyaAkun() {
  const [filter, setFilterState] = useState<FilterPegawai>(FILTER_BELUM);
  const setFilter = useCallback((ubah: Partial<FilterPegawai>) => setFilterState((f) => ({ ...f, page: 1, ...ubah })), []);
  const daftar = usePegawaiAdmin(filter);
  const kirimUndangan = useUndangPegawai();
  const [undang, setUndang] = useState<PegawaiAdmin | null>(null);
  const [ubah, setUbah] = useState<PegawaiAdmin | null>(null);
  const unit = useBidangAdmin();

  const kolom = useMemo<DataTableColumn<PegawaiAdmin>[]>(
    () => [
      {
        id: "nama",
        header: "Pegawai",
        cell: ({ row }) => (
          <span className="block max-w-64 min-w-40 font-semibold whitespace-normal">
            {row.original.nama}
            <LabelRole role={row.original.roleUndangan} />
          </span>
        ),
      },
      {
        id: "jabatan",
        header: "Jabatan",
        cell: ({ row }) => <span className="block max-w-56 min-w-36 text-sm whitespace-normal">{row.original.jabatan ?? <span className="text-muted-foreground">-</span>}</span>,
      },
      { id: "unit", header: "Bidang", cell: ({ row }) => <UnitChip className="max-w-72 whitespace-normal">{row.original.bidang.nama}</UnitChip> },
      {
        id: "nip",
        header: "NIP",
        cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.nip ?? <span className="text-muted-foreground">-</span>}</span>,
      },
      {
        id: "aksi",
        header: () => <span className="block text-right">Aksi</span>,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <TombolUbah nama={row.original.nama} onClick={() => setUbah(row.original)} />
            <TombolUndang p={row.original} onClick={() => setUndang(row.original)} />
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <div className="p-4 md:p-5">
        <KolomCari value={filter.q} onChange={(q) => setFilter({ q })} placeholder="Nama atau NIP..." label="Cari pegawai" className="sm:max-w-sm" />
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
            caption="Pegawai yang belum punya akun"
            getRowKey={(p) => String(p.id)}
            renderMobileCard={(p) => (
              <KartuMaster
                judul={
                  <>
                    {p.nama}
                    <LabelRole role={p.roleUndangan} />
                    <span className="block text-xs font-normal text-muted-foreground">{p.jabatan ?? "Jabatan belum diisi"}</span>
                  </>
                }
                aksi={
                  <div className="flex items-center gap-1">
                    <TombolUbah nama={p.nama} onClick={() => setUbah(p)} />
                    <TombolUndang p={p} onClick={() => setUndang(p)} />
                  </div>
                }
              >
                <UnitChip className="max-w-full self-start whitespace-normal">{p.bidang.nama}</UnitChip>
                <span className="text-xs text-muted-foreground tabular-nums">NIP {p.nip ?? "-"}</span>
              </KartuMaster>
            )}
            className={cn("transition-opacity duration-150", daftar.isPlaceholderData && "opacity-60")}
            empty={{
              icon: UserCheck,
              title: filter.q ? "Tidak ada pegawai yang cocok." : "Semua pegawai aktif sudah punya akun.",
            }}
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

      {ubah && <PegawaiDialog pegawai={ubah} unit={unit.data ?? []} onClose={() => setUbah(null)} />}
      {undang && (
        <UndangDialog
          title={`Undang ${undang.nama}`}
          defaultRole={undang.roleUndangan}
          penerima={
            <>
              <p className="truncate font-semibold">{undang.nama}</p>
              <p className="truncate text-xs text-muted-foreground">
                {undang.nip ? `NIP ${undang.nip}` : "Tanpa NIP"} · {undang.bidang.nama}
              </p>
            </>
          }
          submitLabel="Kirim undangan"
          pending={kirimUndangan.isPending}
          onClose={() => setUndang(null)}
          onSubmit={(isi, gagal) =>
            kirimUndangan.mutate(
              { pegawaiId: undang.id, isi },
              {
                onSuccess: (h) => {
                  toast.success(`Undangan dikirim ke ${h.email}`);
                  setUndang(null);
                },
                onError: gagal,
              },
            )
          }
        />
      )}
    </>
  );
}
