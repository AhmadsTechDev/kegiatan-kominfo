// =============================================================================
// TAMPILAN MANAJEMEN PENGELOLAAN AKUN PENGGUNA
// =============================================================================
// Gunanya: menyediakan antarmuka manajemen akun pengguna aplikasi: daftar akun dengan
// pencarian dan filter, pembuatan akun, aksi akun, dan permintaan akses dari pegawai.
//
// Isi berkas:
//   - TombolAksi : tombol Ubah dan menu aksi lain untuk satu akun (baris tabel dan kartu)
//   - KartuAkun  : tampilan satu akun sebagai kartu di layar sempit
//   - DaftarAkun : tabel daftar akun berpaginasi dengan pencarian (nama/email/NIP),
//                  filter role, dan filter status akun
//   - IsiAkun    : pengelola navigasi tab (Akun dan Permintaan akun)
//   - AkunView   : komponen tampilan utama halaman manajemen akun dengan AdminGuard
//
// Cara kerja:
//   1. Administrator mencari dan menyaring akun; nama akun menuju halaman detail.
//   2. "Buat akun" membuka formulir; akun baru berstatus Menunggu aktivasi sampai pemiliknya
//      membuat kata sandi dari tautan di email pribadinya.
//   3. Menu aksi baris menyediakan ubah, kirim ulang undangan, atur ulang sandi, keluarkan
//      sesi, nonaktifkan/aktifkan kembali, dan hapus (lihat akun-aksi.tsx).
//
// Catatan penting:
//   - Tidak ada pendaftaran mandiri; semua akun dibuat di sini atau lewat Undang di Master data.
//   - Penghapusan permanen hanya diizinkan bagi akun yang belum pernah dipakai.
//
// Dipakai oleh: frontend/src/app/(app)/admin/akun/page.tsx
// =============================================================================

"use client";

import { Ellipsis, Lock, MailWarning, Pencil, Plus, SearchX, UserCog } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { AvatarInisial } from "@/components/shared/avatar-inisial";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { Panel, PanelFooter } from "@/components/shared/panel";
import { StatusAkunBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import { LABEL_ROLE, LABEL_STATUS_AKUN, type Role, type StatusAkun } from "@/types/auth";
import { cn } from "@/lib/utils";
import { UKURAN_HALAMAN_ADMIN } from "../api/admin";
import { useAkunAdmin, useJumlahPermintaan } from "../hooks/use-admin";
import type { AkunAdmin, FilterAkun } from "../types";
import { AdminGuard, idTab, KolomCari, PilihanTab } from "./admin-shared";
import { AkunFormDialog, dariAdmin, ItemAksiAkun, useAksiAkun, type AkunRingkas, type JenisAksi } from "./akun-aksi";
import { BelumPunyaAkun } from "./akun-belum-tab";
import { PermintaanTab } from "./permintaan-tab";

const SEMUA = "semua";
const ROLE: Role[] = ["PEGAWAI", "PIMPINAN", "ADMIN"];
const STATUS: StatusAkun[] = ["MENUNGGU_AKTIVASI", "AKTIF", "NONAKTIF"];
const FILTER_AWAL: FilterAkun = { q: "", role: null, status: null, nonaktif: "0", page: 1 };

type Buka = (j: JenisAksi, a: AkunRingkas) => void;

function TombolAksi({ akun, idSaya, buka }: { akun: AkunRingkas; idSaya?: string; buka: Buka }) {
  return (
    <div className="flex shrink-0 justify-end gap-0.5">
      <Button variant="ghost" size="icon" className="size-9 text-muted-foreground pointer-coarse:size-11" aria-label={`Ubah ${akun.name}`} onClick={() => buka("ubah", akun)}>
        <Pencil />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-9 text-muted-foreground pointer-coarse:size-11" aria-label={`Aksi lain untuk ${akun.name}`}>
            <Ellipsis />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <ItemAksiAkun akun={akun} idSaya={idSaya} buka={buka} denganDetail />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// Tampilan kartu di bawah md (DESIGN.md bagian 10): kolom aksi tidak tersembunyi di balik gulir menyamping
function KartuAkun({ a, idSaya, buka }: { a: AkunAdmin; idSaya?: string; buka: Buka }) {
  const p = a.pegawai;
  return (
    <div className="flex items-start gap-3 rounded-xl border bg-card p-3">
      <AvatarInisial nama={a.name} src={a.foto} className="size-10" />
      <div className="min-w-0 flex-1">
        <Link
          href={`/admin/akun/${a.id}`}
          className="inline-flex items-center rounded font-semibold break-words hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none pointer-coarse:min-h-11"
        >
          {a.name}
          {a.id === idSaya && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(Anda)</span>}
        </Link>
        <p className="truncate text-xs text-muted-foreground">{a.email}</p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold text-primary">{LABEL_ROLE[a.role]}</span>
          <StatusAkunBadge status={a.status} />
          {a.terkunci && (
            <span className="inline-flex items-center gap-1 text-xs text-status-berlangsung-foreground">
              <Lock aria-hidden className="size-3" />
              Terkunci sementara
            </span>
          )}
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">{p ? [p.unitKerja, p.jabatan].filter(Boolean).join(" · ") : "Belum ada data kepegawaian"}</p>
      </div>
      <TombolAksi akun={dariAdmin(a)} idSaya={idSaya} buka={buka} />
    </div>
  );
}

// nonaktif: tab Nonaktif memuat khusus akun nonaktif; tab Akun menyembunyikannya agar tidak mengganggu tabel utama
function DaftarAkun({ nonaktif = false }: { nonaktif?: boolean }) {
  const { user } = useCurrentUser();
  const idSaya = user?.id;
  // ?status=... dipakai tautan dari dashboard (mis. akun menunggu aktivasi)
  const statusAwal = useSearchParams().get("status");
  const [filter, setFilterState] = useState<FilterAkun>(() => ({
    ...FILTER_AWAL,
    nonaktif: nonaktif ? "1" : "0",
    status: STATUS.find((s) => s === statusAwal) ?? null,
  }));
  const setFilter = useCallback((ubah: Partial<FilterAkun>) => setFilterState((f) => ({ ...f, page: 1, ...ubah })), []);
  const daftar = useAkunAdmin(filter);
  const [baru, setBaru] = useState(false);
  const { buka, dialog } = useAksiAkun({ idSaya });
  const adaFilter = filter.q !== "" || filter.role !== null || filter.status !== null;
  const filterAwal: FilterAkun = { ...FILTER_AWAL, nonaktif: nonaktif ? "1" : "0" };

  const kolom = useMemo<DataTableColumn<AkunAdmin>[]>(
    () => [
      {
        id: "nama",
        header: "Akun",
        cell: ({ row }) => {
          const a = row.original;
          return (
            <span className="flex max-w-80 min-w-56 items-center gap-2.5 whitespace-normal">
              <AvatarInisial nama={a.name} src={a.foto} className="size-8" />
              <span className="flex min-w-0 flex-col">
                <Link
                  href={`/admin/akun/${a.id}`}
                  className="rounded font-semibold hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  {a.name}
                  {a.id === idSaya && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(Anda)</span>}
                </Link>
                <span className="truncate text-xs text-muted-foreground">{a.email}</span>
              </span>
            </span>
          );
        },
      },
      {
        id: "role",
        header: "Role",
        cell: ({ row }) => <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold text-primary">{LABEL_ROLE[row.original.role]}</span>,
      },
      {
        id: "unit",
        header: "Kepegawaian",
        cell: ({ row }) => {
          const a = row.original;
          const p = a.pegawai;
          if (p) {
            return (
              <span className="flex max-w-64 min-w-44 flex-col gap-0.5 whitespace-normal">
                <span className="text-sm font-medium">{p.unitKerja}</span>
                <span className="text-xs text-muted-foreground">
                  {[p.jabatan, p.nip ? `NIP ${p.nip}` : "Tanpa NIP"].filter(Boolean).join(" · ")}
                </span>
              </span>
            );
          }
          return (
            <span className="flex flex-col items-start gap-1">
              <span className="text-xs font-semibold text-status-berlangsung-foreground">Belum ada data kepegawaian</span>
              <button
                type="button"
                onClick={() => buka("ubah", dariAdmin(a))}
                className="inline-flex items-center rounded text-xs font-semibold text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none pointer-coarse:min-h-11"
              >
                Lengkapi jabatan dan unit
              </button>
            </span>
          );
        },
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const a = row.original;
          return (
            <span className="flex flex-col items-start gap-1">
              <StatusAkunBadge status={a.status} />
              {a.terkunci && (
                <span className="inline-flex items-center gap-1 text-xs text-status-berlangsung-foreground">
                  <Lock aria-hidden className="size-3" />
                  Terkunci sementara
                </span>
              )}
              {a.emailBaru && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" title={a.emailBaru}>
                  <MailWarning aria-hidden className="size-3" />
                  Ganti email menunggu
                </span>
              )}
            </span>
          );
        },
      },
      {
        id: "aksi",
        header: () => <span className="block text-right">Aksi</span>,
        cell: ({ row }) => <TombolAksi akun={dariAdmin(row.original)} idSaya={idSaya} buka={buka} />,
      },
    ],
    [buka, idSaya],
  );

  return (
    <>
      <div className="grid gap-3 p-4 sm:grid-cols-2 md:p-5 lg:grid-cols-[minmax(12rem,1fr)_10rem_11rem_auto]">
        <KolomCari value={filter.q} onChange={(q) => setFilter({ q })} placeholder="Nama, email, atau NIP..." label="Cari akun" className="sm:col-span-2 lg:col-span-1" />
        <Select value={filter.role ?? SEMUA} onValueChange={(v) => setFilter({ role: v === SEMUA ? null : (v as Role) })}>
          <SelectTrigger className="h-10 pointer-coarse:min-h-11 w-full" aria-label="Filter role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SEMUA}>Semua role</SelectItem>
            {ROLE.map((r) => (
              <SelectItem key={r} value={r}>
                {LABEL_ROLE[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!nonaktif && (
          <Select value={filter.status ?? SEMUA} onValueChange={(v) => setFilter({ status: v === SEMUA ? null : (v as StatusAkun) })}>
            <SelectTrigger className="h-10 pointer-coarse:min-h-11 w-full" aria-label="Filter status akun">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SEMUA}>Semua status</SelectItem>
              {STATUS.filter((s) => s !== "NONAKTIF").map((s) => (
                <SelectItem key={s} value={s}>
                  {LABEL_STATUS_AKUN[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {!nonaktif && (
          <Button className="h-10 pointer-coarse:min-h-11 sm:col-span-2 lg:col-span-1" onClick={() => setBaru(true)}>
            <Plus aria-hidden />
            Buat akun
          </Button>
        )}
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
            caption="Daftar akun"
            getRowKey={(a) => a.id}
            renderMobileCard={(a) => <KartuAkun a={a} idSaya={idSaya} buka={buka} />}
            className={cn("transition-opacity duration-150", daftar.isPlaceholderData && "opacity-60")}
            empty={
              adaFilter
                ? {
                    icon: SearchX,
                    title: "Tidak ada akun yang cocok.",
                    action: (
                      <Button variant="outline" className="h-10 pointer-coarse:min-h-11" onClick={() => setFilterState(filterAwal)}>
                        Atur ulang filter
                      </Button>
                    ),
                  }
                : {
                    icon: UserCog,
                    title: nonaktif ? "Tidak ada akun nonaktif." : "Belum ada akun.",
                    action: (
                      <Button variant="outline" className="h-10 pointer-coarse:min-h-11" onClick={() => setBaru(true)}>
                        <Plus aria-hidden />
                        Buat akun pertama
                      </Button>
                    ),
                  }
            }
          />
          {daftar.data && daftar.data.total > 0 && (
            <PanelFooter>
              <PaginationBar
                className="w-full"
                satuan="akun"
                page={daftar.data.page}
                pageSize={UKURAN_HALAMAN_ADMIN}
                total={daftar.data.total}
                onPageChange={(page) => setFilterState((f) => ({ ...f, page }))}
              />
            </PanelFooter>
          )}
        </>
      )}

      {baru && <AkunFormDialog akun="baru" idSaya={idSaya} onClose={() => setBaru(false)} />}
      {dialog}
    </>
  );
}

type TabAkun = "akun" | "belum" | "nonaktif" | "permintaan";
const TAB_SAH: TabAkun[] = ["akun", "belum", "nonaktif", "permintaan"];
const ID_PANEL = "panel-manajemen-akun";

function IsiAkun() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tab: TabAkun = TAB_SAH.find((t) => t === searchParams.get("tab")) ?? "akun";
  const jumlah = useJumlahPermintaan();
  const menunggu = jumlah.data?.menunggu ?? 0;

  return (
    <Panel>
      <div className="border-b border-muted px-4 pt-4 pb-3 md:px-5">
        <PilihanTab
          label="Bagian manajemen akun"
          idPanel={ID_PANEL}
          value={tab}
          onChange={(t) => router.replace(t === "akun" ? pathname : `${pathname}?tab=${t}`, { scroll: false })}
          opsi={[
            { nilai: "akun", label: "Akun" },
            { nilai: "belum", label: "Belum punya akun" },
            { nilai: "nonaktif", label: "Nonaktif" },
            { nilai: "permintaan", label: "Permintaan akses", lencana: menunggu },
          ]}
        />
      </div>
      <div role="tabpanel" id={ID_PANEL} aria-labelledby={idTab(ID_PANEL, tab)}>
        {tab === "permintaan" ? <PermintaanTab /> : tab === "belum" ? <BelumPunyaAkun /> : <DaftarAkun key={tab} nonaktif={tab === "nonaktif"} />}
      </div>
    </Panel>
  );
}

export function AkunView() {
  return (
    <>
      <PageHeader
        eyebrow="Administrasi"
        title="Manajemen akun"
        description="Buat akun atau undang pegawai, atur role dan status, nonaktifkan atau hapus akun, serta tinjau permintaan akses."
      />
      <AdminGuard>
        <IsiAkun />
      </AdminGuard>
    </>
  );
}
