"use client";

import { Check, Inbox, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { PanelFooter } from "@/components/shared/panel";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { formatTanggalJam } from "@/lib/format";
import { cn } from "@/lib/utils";
import { UKURAN_HALAMAN_ADMIN } from "../api/admin";
import { usePermintaanAkun, useProsesPermintaan } from "../hooks/use-admin";
import type { PermintaanAkun, StatusPermintaan } from "../types";
import { PilihanTab } from "./admin-shared";
import { UndangDialog } from "./undang-dialog";

// Tab tinjau, setujui, atau tolak permintaan akun dari halaman minta akun

const LABEL_STATUS: Record<StatusPermintaan, string> = { MENUNGGU: "Menunggu", DISETUJUI: "Disetujui", DITOLAK: "Ditolak" };
const NADA_STATUS: Record<StatusPermintaan, string> = {
  MENUNGGU: "bg-status-berlangsung text-status-berlangsung-foreground",
  DISETUJUI: "bg-status-selesai text-status-selesai-foreground",
  DITOLAK: "bg-status-dibatalkan text-status-dibatalkan-foreground",
};

type Filter = "MENUNGGU" | "SEMUA";

export function PermintaanTab() {
  const [filter, setFilter] = useState<Filter>("MENUNGGU");
  const [page, setPage] = useState(1);
  const daftar = usePermintaanAkun({ status: filter === "SEMUA" ? null : "MENUNGGU", page });
  const proses = useProsesPermintaan();
  const [setujui, setSetujui] = useState<PermintaanAkun | null>(null);
  const [tolak, setTolak] = useState<PermintaanAkun | null>(null);
  const [alasan, setAlasan] = useState("");
  const [galatAlasan, setGalatAlasan] = useState<string | null>(null);

  const tutupTolak = useCallback(() => {
    setTolak(null);
    setAlasan("");
    setGalatAlasan(null);
  }, []);

  const kolom = useMemo<DataTableColumn<PermintaanAkun>[]>(
    () => [
      {
        id: "pemohon",
        header: "Pemohon",
        cell: ({ row }) => {
          const p = row.original;
          if (!p.pegawai) {
            return (
              <span className="flex max-w-72 min-w-56 flex-col items-start gap-1 whitespace-normal">
                <span className="font-semibold">{p.nama}</span>
                <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">Tanpa NIP</span>
              </span>
            );
          }
          const namaBeda = p.nama.trim().toLowerCase() !== p.pegawai.nama.trim().toLowerCase();
          return (
            <span className="flex max-w-72 min-w-56 flex-col gap-0.5 whitespace-normal">
              <span className="font-semibold">{p.pegawai.nama}</span>
              {p.pegawai.nip && <span className="text-xs text-muted-foreground tabular-nums">NIP {p.pegawai.nip}</span>}
              <span className="text-xs text-muted-foreground">
                {p.bidang}
              </span>
              {namaBeda && <span className="text-xs text-status-berlangsung-foreground">Nama diisi: {p.nama}</span>}
            </span>
          );
        },
      },
      {
        id: "email",
        header: "Email dan catatan",
        cell: ({ row }) => (
          <span className="flex max-w-64 min-w-44 flex-col gap-0.5 whitespace-normal">
            <span className="text-sm break-all">{row.original.email}</span>
            {row.original.catatan && <span className="text-xs text-muted-foreground">“{row.original.catatan}”</span>}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const p = row.original;
          return (
            <span className="flex max-w-56 flex-col items-start gap-1 whitespace-normal">
              <span className={cn("rounded-md px-2 py-0.5 text-xs font-semibold", NADA_STATUS[p.status])}>{LABEL_STATUS[p.status]}</span>
              <span className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">Diajukan {formatTanggalJam(p.createdAt)}</span>
              {p.status !== "MENUNGGU" && p.diprosesOleh && <span className="text-xs text-muted-foreground">oleh {p.diprosesOleh}</span>}
              {p.alasanTolak && <span className="text-xs text-muted-foreground">Alasan: {p.alasanTolak}</span>}
            </span>
          );
        },
      },
      {
        id: "aksi",
        header: () => <span className="block text-right">Aksi</span>,
        cell: ({ row }) =>
          row.original.status === "MENUNGGU" ? (
            <div className="flex justify-end gap-1.5">
              <Button variant="outline" size="sm" className="h-8 gap-1 text-xs pointer-coarse:h-11" onClick={() => setTolak(row.original)}>
                <X aria-hidden className="size-3.5" />
                Tolak
              </Button>
              <Button size="sm" className="h-8 gap-1 text-xs pointer-coarse:h-11" onClick={() => setSetujui(row.original)}>
                <Check aria-hidden className="size-3.5" />
                Setujui
              </Button>
            </div>
          ) : null,
      },
    ],
    [],
  );

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-5">
        <PilihanTab
          label="Filter status permintaan"
          value={filter}
          onChange={(f) => {
            setFilter(f);
            setPage(1);
          }}
          opsi={[
            { nilai: "MENUNGGU", label: "Menunggu persetujuan" },
            { nilai: "SEMUA", label: "Semua riwayat" },
          ]}
        />
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
            caption="Permintaan akun"
            getRowKey={(p) => String(p.id)}
            className={cn("transition-opacity duration-150", daftar.isPlaceholderData && "opacity-60")}
            empty={{
              icon: Inbox,
              title: filter === "MENUNGGU" ? "Tidak ada permintaan yang menunggu." : "Belum ada permintaan akun.",
              description: "Pegawai dapat meminta akun lewat tautan “Minta akun” di halaman login.",
            }}
          />
          {daftar.data && daftar.data.total > 0 && (
            <PanelFooter>
              <PaginationBar className="w-full" satuan="permintaan" page={daftar.data.page} pageSize={UKURAN_HALAMAN_ADMIN} total={daftar.data.total} onPageChange={setPage} />
            </PanelFooter>
          )}
        </>
      )}

      {setujui && (
        <UndangDialog
          title={`Setujui permintaan ${setujui.pegawai?.nama ?? setujui.nama}`}
          penerima={
            <>
              <p className="truncate font-semibold">{setujui.pegawai?.nama ?? setujui.nama}</p>
              <p className="text-xs text-muted-foreground">
                {setujui.pegawai
                  ? `NIP ${setujui.pegawai.nip} · ${setujui.bidang}`
                  : "Tanpa NIP terdaftar. Pilih bidangnya; data pegawainya dibuat bersamaan dengan akun."}
              </p>
            </>
          }
          defaultEmail={setujui.email}
          pilihUnit={!setujui.pegawai}
          submitLabel="Setujui dan kirim undangan"
          pending={proses.isPending}
          onClose={() => setSetujui(null)}
          onSubmit={(isi, gagal) =>
            proses.mutate(
              { id: setujui.id, aksi: "setujui", isi },
              {
                onSuccess: () => {
                  toast.success(`Permintaan disetujui. Undangan aktivasi dikirim ke ${isi.email}`);
                  setSetujui(null);
                },
                onError: gagal,
              },
            )
          }
        />
      )}
      {tolak && (
        <ConfirmDialog
          open
          onOpenChange={(v) => !v && tutupTolak()}
          title={`Tolak permintaan ${tolak.pegawai?.nama ?? tolak.nama}?`}
          description="Pemohon akan menerima email berisi alasan penolakan. Ia dapat mengajukan permintaan baru setelahnya."
          confirmLabel="Tolak permintaan"
          pendingLabel="Menolak..."
          pending={proses.isPending}
          onConfirm={() => {
            if (!alasan.trim()) return setGalatAlasan("Alasan penolakan wajib diisi");
            proses.mutate(
              { id: tolak.id, aksi: "tolak", alasan: alasan.trim() },
              {
                onSuccess: () => {
                  toast.success("Permintaan ditolak dan pemohon diberi tahu");
                  tutupTolak();
                },
                onError: (e) => setGalatAlasan(e.message),
              },
            );
          }}
        >
          <Field data-invalid={!!galatAlasan}>
            <FieldLabel htmlFor="alasan-tolak">Alasan penolakan</FieldLabel>
            <Textarea
              id="alasan-tolak"
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Contoh: gunakan email dinas @palembang.go.id"
              aria-invalid={!!galatAlasan}
              autoFocus
            />
            {galatAlasan && <FieldError>{galatAlasan}</FieldError>}
          </Field>
        </ConfirmDialog>
      )}
    </>
  );
}
