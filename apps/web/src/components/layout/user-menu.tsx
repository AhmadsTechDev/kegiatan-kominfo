// =============================================================================
// MENU PENGGUNA DAN IDENTITAS AKUN (USER MENU)
// =============================================================================
// Gunanya: Menampilkan profil pengguna aktif, informasi bidang, dan kendali sesi
// pada bilah atas serta bagian bawah bilah samping Aplikasi Pendataan Kegiatan.
//
// Isi berkas:
//   - useUnitSaya    : hook lokal pengambil nama bidang dan NIP pengguna aktif
//   - useFotoSaya    : hook lokal pengambil URL foto profil pengguna aktif
//   - UserMenu       : menu profil di bilah atas dengan tautan akun dan ganti sandi
//   - SidebarAccount : kartu ringkas identitas akun di bagian dasar bilah samping
//
// Cara kerja:
//   1. Memuat data profil pengguna login dari sesi autentikasi TanStack Query.
//   2. Merender inisial avatar, nama, bidang, serta menu tarik-turun akun.
//   3. Mengelola dialog modal perubahan kata sandi dan memproses fungsi logout.
//
// Dipakai oleh: frontend/src/components/layout/app-shell.tsx
// =============================================================================

"use client";

import { ChevronDown, KeyRound, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AvatarInisial } from "@/components/shared/avatar-inisial";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { GantiSandiDialog } from "@/features/auth/components/ganti-sandi-dialog";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import { useLogout } from "@/features/auth/hooks/use-logout";
import { useProfil } from "@/features/auth/hooks/use-profil";
import { cn } from "@/lib/utils";
import { KETERANGAN_ROLE } from "@/types/auth";

function useUnitSaya() {
  const { data } = useProfil();
  const p = data?.pegawai;
  return p ? { unit: p.bidang.nama, nip: p.nip } : null;
}

const useFotoSaya = () => useProfil().data?.foto ?? null;

export function UserMenu() {
  const { user, isPending } = useCurrentUser();
  const unitSaya = useUnitSaya();
  const foto = useFotoSaya();
  const { logout, pending } = useLogout();
  const [gantiSandi, setGantiSandi] = useState(false);

  if (isPending || !user) return <Skeleton className="h-10 w-10 rounded-lg md:w-44" />;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-11 gap-2.5 px-1.5" aria-label={`Menu pengguna ${user.name}`}>
            <AvatarInisial nama={user.name} src={foto} />
            <span className="hidden flex-col items-start leading-tight md:flex">
              <span className="text-sm font-semibold">{user.name}</span>
              <span className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
                {user.role === "PIMPINAN" && <span aria-hidden className="size-1.5 rounded-full bg-aksen-peran" />}
                {KETERANGAN_ROLE[user.role] ?? user.role}
              </span>
            </span>
            <ChevronDown aria-hidden className="hidden size-4 text-muted-foreground md:block" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{user.name}</span>
            <span className="truncate text-xs font-normal text-muted-foreground">{user.email}</span>
            {unitSaya && (
              <span className="mt-1.5 flex flex-col gap-0.5 rounded-md bg-muted px-2 py-1.5 text-xs font-normal">
                <span className="text-muted-foreground">Bidang</span>
                <span className="font-semibold text-foreground">{unitSaya.unit}</span>
                {unitSaya.nip && <span className="text-muted-foreground tabular-nums">NIP {unitSaya.nip}</span>}
              </span>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/pengaturan">
              <Settings aria-hidden />
              Pengaturan
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setGantiSandi(true)}>
            <KeyRound aria-hidden />
            Ganti kata sandi
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={logout} disabled={pending} variant="destructive">
            <LogOut aria-hidden />
            Keluar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <GantiSandiDialog open={gantiSandi} onOpenChange={setGantiSandi} />
    </>
  );
}

export function SidebarAccount({ hideTextClassName, className }: { hideTextClassName: string; className?: string }) {
  const { user, isPending } = useCurrentUser();
  const { logout, pending } = useLogout();
  const unitSaya = useUnitSaya();
  const foto = useFotoSaya();

  if (isPending || !user) return <Skeleton className="h-14 w-full rounded-[22px] bg-sidebar-group" />;

  return (
    <div className={cn("flex items-center gap-2.5 rounded-[22px] bg-sidebar-group p-2", className)}>
      <AvatarInisial nama={user.name} src={foto} className="size-10 bg-sidebar-primary/15 text-sidebar-primary" />
      <div className={cn("min-w-0 flex-1 flex-col", hideTextClassName)}>
        <p className="truncate text-sm font-semibold text-sidebar-strong">{user.name}</p>
        <p className="truncate text-xs text-sidebar-foreground" title={unitSaya?.unit}>
          {unitSaya?.unit ?? KETERANGAN_ROLE[user.role] ?? user.role}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className={cn("size-9 shrink-0 rounded-full text-sidebar-foreground hover:bg-sidebar-hover hover:text-sidebar-strong", hideTextClassName)}
        onClick={logout}
        disabled={pending}
        aria-label="Keluar"
      >
        <LogOut />
      </Button>
    </div>
  );
}
