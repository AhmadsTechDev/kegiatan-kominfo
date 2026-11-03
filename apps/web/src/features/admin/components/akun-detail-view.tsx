// =============================================================================
// HALAMAN DETAIL AKUN (ADMIN)
// =============================================================================
// Gunanya: Menampilkan satu akun secara lengkap untuk administrator: identitas, status,
// informasi akun, data kepegawaian, undangan yang masih berlaku, sesi aktif, dan riwayat.
//
// Isi berkas:
//   - Kepala          : avatar, nama, role, status, dan tombol aksi akun
//   - PanelUndangan   : masa berlaku tautan aktivasi untuk akun yang belum diaktivasi
//   - PanelSesiAkun   : sesi login aktif (tanpa token) dengan aksi keluarkan dari semua perangkat
//   - PanelRiwayat    : 15 catatan audit terbaru yang menyangkut akun ini
//   - AkunDetailView  : komponen induk dengan keadaan memuat, galat, dan tidak ditemukan
//
// Catatan penting:
//   - Aksi memakai dialog yang sama dengan halaman daftar akun (akun-aksi.tsx).
//
// Dipakai oleh: frontend/src/app/(app)/admin/akun/[id]/page.tsx
// =============================================================================

"use client";

import { ArrowLeft, Ellipsis, Lock, MailWarning, Pencil, Send, UserX } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AvatarInisial } from "@/components/shared/avatar-inisial";
import { DaftarSesi } from "@/components/shared/daftar-sesi";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import { StatusAkunBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import { Baris, Kosong } from "@/features/pengaturan/components/panel-profil";
import { ApiError } from "@/lib/api-client";
import { formatTanggalJam, formatTelp } from "@/lib/format";
import { LABEL_ROLE } from "@/types/auth";
import { useDetailAkun } from "../hooks/use-admin";
import type { AkunDetail } from "../types";
import { AdminGuard } from "./admin-shared";
import { dariDetail, ItemAksiAkun, useAksiAkun, type AkunRingkas, type JenisAksi } from "./akun-aksi";
import { ChipAksi, labelEntitas } from "./audit-log-view";

function Kepala({ a, idSaya, buka }: { a: AkunDetail; idSaya?: string; buka: (j: JenisAksi, akun: AkunRingkas) => void }) {
  const ringkas = dariDetail(a);
  return (
    <Panel>
      {/* Tanpa PanelHeader, jadi padding atas ditambahkan agar sama dengan bawah */}
      <PanelBody className="flex flex-col gap-4 pt-4 sm:flex-row sm:items-center md:pt-5">
        <AvatarInisial nama={a.name} src={a.foto} className="size-16 rounded-2xl text-lg" />
        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-2xl font-extrabold tracking-tight break-words">
            {a.name}
            {a.id === idSaya && <span className="ml-2 text-sm font-normal text-muted-foreground">(Anda)</span>}
          </h1>
          <p className="truncate text-sm text-muted-foreground">{a.email}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold text-primary">{LABEL_ROLE[a.role]}</span>
            <StatusAkunBadge status={a.status} />
            {a.terkunci && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-status-berlangsung-foreground">
                <Lock aria-hidden className="size-3" />
                Terkunci sementara
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="h-10 pointer-coarse:min-h-11" onClick={() => buka("ubah", ringkas)}>
            <Pencil aria-hidden />
            Ubah
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="size-10 pointer-coarse:size-11" aria-label={`Aksi lain untuk ${a.name}`}>
                <Ellipsis />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <ItemAksiAkun akun={ringkas} idSaya={idSaya} buka={buka} />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </PanelBody>
      {a.status === "NONAKTIF" && (
        <p className="mx-5 mb-5 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground md:mx-6">
          Dinonaktifkan{a.banReason && a.banReason !== "Dinonaktifkan admin" ? `: ${a.banReason}` : "."} Akun ini tidak bisa masuk.
        </p>
      )}
    </Panel>
  );
}

function PanelUndangan({ a, buka }: { a: AkunDetail; buka: (j: JenisAksi, akun: AkunRingkas) => void }) {
  const kedaluwarsa = a.undangan?.kedaluwarsa;
  return (
    <Panel>
      <PanelHeader title="Undangan aktivasi" description="Akun aktif setelah pemiliknya membuat kata sandi dari tautan di email." />
      <PanelBody className="flex flex-col gap-3 border-t border-muted pt-4 sm:flex-row sm:items-center md:pt-5">
        <p className="min-w-0 flex-1 text-sm">
          {kedaluwarsa ? (
            <>
              Tautan terkirim ke <span className="font-semibold break-all">{a.email}</span>, berlaku sampai {formatTanggalJam(kedaluwarsa)}.
            </>
          ) : (
            <span className="text-status-berlangsung-foreground">Tidak ada tautan aktivasi yang masih berlaku. Kirim ulang undangan agar pemiliknya bisa mengaktifkan akun.</span>
          )}
        </p>
        <Button variant="outline" className="h-10 pointer-coarse:min-h-11" onClick={() => buka("undang", dariDetail(a))}>
          <Send aria-hidden />
          Kirim ulang undangan
        </Button>
      </PanelBody>
    </Panel>
  );
}

function PanelSesiAkun({ a, buka }: { a: AkunDetail; buka: (j: JenisAksi, akun: AkunRingkas) => void }) {
  return (
    <Panel>
      <PanelHeader
        title="Sesi aktif"
        description="Perangkat yang sedang masuk dengan akun ini."
        action={
          a.sesi.length > 0 && (
            <Button variant="outline" size="sm" className="h-9 pointer-coarse:min-h-11" onClick={() => buka("sesi", dariDetail(a))}>
              Keluarkan dari semua perangkat
            </Button>
          )
        }
      />
      <PanelBody className="border-t border-muted pt-1 md:pt-1">
        {a.sesi.length ? <DaftarSesi sesi={a.sesi} /> : <p className="py-4 text-sm text-muted-foreground">Tidak ada sesi aktif.</p>}
      </PanelBody>
    </Panel>
  );
}

function PanelRiwayat({ a }: { a: AkunDetail }) {
  return (
    <Panel>
      <PanelHeader title="Riwayat terbaru" description="Aksi terhadap akun ini dan aksi yang dilakukannya." />
      {a.riwayat.length ? (
        <ol className="divide-y divide-muted border-t border-muted">
          {a.riwayat.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 text-sm md:px-6">
              <ChipAksi aksi={r.aksi} />
              <span className="min-w-0 flex-1 text-muted-foreground">
                {r.aktor ? (r.aktor.id === a.id ? "oleh pemilik akun" : `oleh ${r.aktor.nama}`) : "oleh sistem atau pengguna tak dikenal"}
                {r.entitas !== "user" && ` · ${labelEntitas(r.entitas)}${r.entitasId ? ` #${r.entitasId}` : ""}`}
              </span>
              <time dateTime={r.waktu} className="text-xs text-muted-foreground tabular-nums">
                {formatTanggalJam(r.waktu)}
              </time>
            </li>
          ))}
        </ol>
      ) : (
        <PanelBody className="border-t border-muted pt-4 text-sm text-muted-foreground md:pt-5">Belum ada catatan.</PanelBody>
      )}
    </Panel>
  );
}

function IsiDetail({ id }: { id: string }) {
  const { user } = useCurrentUser();
  const router = useRouter();
  const detail = useDetailAkun(id);
  const { buka, dialog } = useAksiAkun({ idSaya: user?.id, setelahHapus: () => router.replace("/admin/akun") });

  if (detail.isPending) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-36 w-full rounded-xl" />
        <div className="grid gap-5 lg:grid-cols-2">
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
      </div>
    );
  }
  if (detail.isError) {
    if (detail.error instanceof ApiError && detail.error.status === 404) {
      return (
        <EmptyState
          icon={UserX}
          title="Akun tidak ditemukan."
          description="Akun ini mungkin sudah dihapus."
          className="rounded-xl border bg-card py-16"
          action={
            <Button asChild variant="outline" className="h-10 pointer-coarse:min-h-11">
              <Link href="/admin/akun">Kembali ke daftar akun</Link>
            </Button>
          }
        />
      );
    }
    return <ErrorState message={detail.error.message} onRetry={() => detail.refetch()} retrying={detail.isRefetching} />;
  }

  const a = detail.data;
  const unit = a.pegawai?.bidang;
  return (
    <div className="flex flex-col gap-5">
      <Kepala a={a} idSaya={user?.id} buka={buka} />
      {a.status === "MENUNGGU_AKTIVASI" && <PanelUndangan a={a} buka={buka} />}
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Informasi akun" />
          <dl className="divide-y divide-muted border-t border-muted">
            <Baris label="Email pribadi">
              <span className="break-all">{a.email}</span>
              <span className="block text-xs font-normal text-muted-foreground">{a.emailVerified ? "Terverifikasi" : "Belum terverifikasi"}</span>
            </Baris>
            {a.emailBaru && (
              <Baris label="Ganti email">
                <span className="inline-flex items-center gap-1.5">
                  <MailWarning aria-hidden className="size-3.5 text-status-berlangsung-foreground" />
                  <span className="break-all">{a.emailBaru}</span>
                </span>
                <span className="block text-xs font-normal text-muted-foreground">Menunggu verifikasi oleh pemilik akun</span>
              </Baris>
            )}
            <Baris label="Kontak">{a.kontak ? formatTelp(a.kontak) : <Kosong />}</Baris>
            <Baris label="Dibuat">{formatTanggalJam(a.createdAt)}</Baris>
            <Baris label="Terakhir diubah">{formatTanggalJam(a.updatedAt)}</Baris>
          </dl>
        </Panel>
        <Panel>
          <PanelHeader title="Data kepegawaian" />
          {a.pegawai ? (
            <dl className="divide-y divide-muted border-t border-muted">
              <Baris label="Nama pegawai">{a.pegawai.nama}</Baris>
              <Baris label="NIP">{a.pegawai.nip ? <span className="tabular-nums">{a.pegawai.nip}</span> : <Kosong teks="Tanpa NIP" />}</Baris>
              <Baris label="Jabatan">{a.pegawai.jabatan ?? <Kosong />}</Baris>
              <Baris label="Bidang">
                {unit?.nama}
                {unit?.parent && <span className="block text-xs font-normal text-muted-foreground">di bawah {unit.parent.nama}</span>}
              </Baris>
            </dl>
          ) : (
            <PanelBody className="flex flex-col items-start gap-3 border-t border-muted pt-4 text-sm md:pt-5">
              <p className="text-muted-foreground">Akun ini belum punya jabatan dan bidang.</p>
              <Button variant="outline" size="sm" className="h-9 pointer-coarse:min-h-11" onClick={() => buka("ubah", dariDetail(a))}>
                Lengkapi data kepegawaian
              </Button>
            </PanelBody>
          )}
        </Panel>
      </div>
      <PanelSesiAkun a={a} buka={buka} />
      <PanelRiwayat a={a} />
      {dialog}
    </div>
  );
}

export function AkunDetailView({ id }: { id: string }) {
  return (
    <div className="flex flex-col gap-4">
      <Button asChild variant="ghost" className="h-9 pointer-coarse:min-h-11 w-fit px-2 text-muted-foreground">
        <Link href="/admin/akun">
          <ArrowLeft aria-hidden />
          Manajemen akun
        </Link>
      </Button>
      <AdminGuard>
        <IsiDetail id={id} />
      </AdminGuard>
    </div>
  );
}
