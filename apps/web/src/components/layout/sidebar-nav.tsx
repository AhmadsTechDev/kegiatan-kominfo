// =============================================================================
// DAFTAR NAVIGASI BILAH SAMPING (SIDEBAR NAVIGATION)
// =============================================================================
// Gunanya: Menyusun dan merender menu navigasi bilah samping sesuai hak akses
// peran pengguna di Aplikasi Pendataan Kegiatan, baik mode penuh maupun rel ikon.
//
// Isi berkas:
//   - kelasLabel : fungsi pembantu penentu kelas CSS untuk teks label responsif
//   - SidebarNav : pembungkus navigasi dengan Suspense untuk membaca URL aktif
//   - ItemSidebar: perender satu baris menu (tautan/tombol, ikon, dan lencana)
//   - DaftarNav  : perender pengelompokan menu dan animasi pemuatan skeleton
//
// Cara kerja:
//   1. Membaca rute aktif via Suspense agar tidak menghambat pemuatan awal halaman.
//   2. Mengelompokkan item menu dan menyorot rute yang sedang dibuka pengguna.
//   3. Menampilkan lencana jumlah antrean (misal permintaan akun) atau titik merah.
//   4. Menampilkan tooltip keterangan saat navigasi berada dalam mode rel ikon.
//
// Dipakai oleh: frontend/src/components/layout/app-shell.tsx
// =============================================================================

"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { navAktif, type NavGroup } from "@/config/navigation";
import { cn } from "@/lib/utils";

type SidebarNavProps = {
  groups: NavGroup[];
  lencana?: Record<string, number>;
  isLoading?: boolean;
  mode: "responsive" | "full";
  collapsed?: boolean;
  onNavigate?: () => void;
};

export function kelasLabel(mode: SidebarNavProps["mode"], collapsed?: boolean) {
  return mode === "responsive" ? cn("flex md:hidden lg:flex", collapsed && "lg:hidden") : "flex";
}

export function SidebarNav(props: SidebarNavProps) {
  return (
    <Suspense fallback={<DaftarNav {...props} pathname={null} search={null} />}>
      <DaftarNavAktif {...props} />
    </Suspense>
  );
}

function DaftarNavAktif(props: SidebarNavProps) {
  return <DaftarNav {...props} pathname={usePathname()} search={useSearchParams()} />;
}

type ItemSidebarProps = {
  label: string;
  icon: LucideIcon;
  aktif?: boolean;
  mode: SidebarNavProps["mode"];
  collapsed?: boolean;
  lencana?: number;
} & ({ href: string; onNavigate?: () => void; onClick?: never } | { href?: never; onNavigate?: never; onClick: () => void });

export function ItemSidebar({ label, icon: Icon, aktif, mode, collapsed, lencana = 0, href, onNavigate, onClick }: ItemSidebarProps) {
  const rail = mode === "responsive";
  const kelas = cn(
    "group flex w-full items-center gap-1 rounded-full text-left outline-none",
    "focus-visible:ring-2 focus-visible:ring-sidebar-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
    rail && "md:justify-center lg:justify-start",
    rail && collapsed && "lg:justify-center",
  );
  const isi = (
    <>
      <span
        className={cn(
          "relative flex size-10 shrink-0 items-center justify-center rounded-full transition-[background-color,color,box-shadow] duration-150 ease-out",
          aktif
            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-sidebar-primary/25"
            : "text-sidebar-foreground group-hover:bg-sidebar-hover group-hover:text-sidebar-primary",
        )}
      >
        <Icon aria-hidden className="size-[18px]" strokeWidth={aktif ? 2.2 : 1.9} />
        {lencana > 0 && (
          <span
            aria-hidden
            className={cn(
              "absolute top-1 right-1 size-2.5 rounded-full border-2 border-sidebar bg-destructive",
              mode === "responsive" ? "md:block lg:hidden" : "hidden",
              mode === "responsive" && collapsed && "lg:block",
            )}
          />
        )}
      </span>
      <span
        className={cn(
          "h-10 min-w-0 flex-1 items-center rounded-full px-4 text-sm font-semibold whitespace-nowrap transition-[background-color,color] duration-150 ease-out",
          kelasLabel(mode, collapsed),
          aktif ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-sidebar-primary/25" : "text-sidebar-foreground group-hover:text-sidebar-strong",
        )}
      >
        <span className="truncate">{label}</span>
        {lencana > 0 && (
          <span
            className={cn(
              "ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums",
              aktif ? "bg-sidebar-primary-foreground text-sidebar-primary" : "bg-destructive text-destructive-foreground",
            )}
          >
            {lencana > 99 ? "99+" : lencana}
          </span>
        )}
      </span>
    </>
  );

  const elemen = href ? (
    <Link
      href={href}
      onClick={onNavigate}
      // Dari menu HP: halaman tujuan menggantikan entri riwayat menu, jadi Kembali langsung ke halaman asal
      replace={!!onNavigate}
      aria-current={aktif ? "page" : undefined}
      aria-label={lencana > 0 ? `${label}, ${lencana} menunggu` : label}
      className={kelas}
    >
      {isi}
    </Link>
  ) : (
    <button type="button" onClick={onClick} aria-label={label} className={kelas}>
      {isi}
    </button>
  );

  if (!rail) return elemen;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{elemen}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={12} className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold", !collapsed && "lg:hidden")}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function DaftarNav({
  groups,
  lencana,
  isLoading,
  mode,
  collapsed,
  onNavigate,
  pathname,
  search,
}: SidebarNavProps & { pathname: string | null; search: URLSearchParams | null }) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2" aria-busy>
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-full bg-sidebar-group" />
        ))}
      </div>
    );
  }

  const aktif = pathname ? navAktif(groups, pathname, search)?.item.href : undefined;

  return (
    <nav aria-label="Menu utama" className="flex flex-col gap-4">
      {groups.map((group) => {
        const berkotak = group.items.length > 1;
        return (
          <div key={group.label} className="flex flex-col gap-1.5">
            {berkotak && (
              <p className={cn("px-4 text-[10px] font-bold tracking-[0.14em] text-sidebar-foreground/70 uppercase", kelasLabel(mode, collapsed))}>
                {group.label}
              </p>
            )}
            <ul aria-label={group.label} className={cn("flex flex-col gap-1", berkotak && "rounded-[22px] bg-sidebar-group p-1")}>
              {group.items.map((item) => (
                <li key={item.href}>
                  <ItemSidebar
                    href={item.href}
                    label={item.label}
                    icon={item.icon}
                    aktif={item.href === aktif}
                    mode={mode}
                    collapsed={collapsed}
                    lencana={lencana?.[item.href]}
                    onNavigate={onNavigate}
                  />
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
