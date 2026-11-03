// =============================================================================
// KERANGKA UTAMA TATA LETAK APLIKASI (APP SHELL)
// =============================================================================
// Gunanya: Menyediakan kerangka tata letak terpadu seluruh halaman Aplikasi Pendataan
// Kegiatan setelah login, mencakup bilah navigasi samping, bilah atas, dan area konten.
//
// Isi berkas:
//   - subHalaman : menentukan teks penutup breadcrumb untuk rute dinamis kegiatan
//   - Breadcrumb : menampilkan jejak remah roti navigasi rute aktif di bilah atas
//   - IsiSidebar : menyusun logo brand, tombol ciutkan, menu navigasi, dan akun
//   - AppShell   : komponen pembungkus utama yang mengatur tata letak responsif
//
// Cara kerja:
//   1. Memeriksa status login pengguna dan menyusun menu navigasi sesuai peran aktif.
//   2. Memantau antrean permintaan akun admin untuk ditampilkan sebagai angka lencana.
//   3. Menampilkan navigasi sebagai bilah geser (drawer) di ponsel, rel ikon di tablet,
//      serta bilah samping penuh yang dapat diciutkan pada layar desktop.
//
// Catatan penting:
//   - Breadcrumb dibungkus Suspense agar pembacaan URL tidak menahan proses render.
//
// Dipakai oleh: frontend/src/app/(app)/layout.tsx
// =============================================================================

"use client";

import { ChevronRight, Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import { lepasLapisan } from "@/hooks/use-tutup-lewat-kembali";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { navAktif, navUntukRole, type NavGroup } from "@/config/navigation";
import { useJumlahPermintaan } from "@/features/admin/hooks/use-admin";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import { LoncengNotifikasi } from "@/features/notifikasi/components/lonceng-notifikasi";
import { PencarianCepat } from "@/features/pencarian/components/pencarian-cepat";
import { SinkronTema } from "@/features/pengaturan/hooks/use-akun-saya";
import { cn } from "@/lib/utils";
import { Brand } from "./brand";
import { kelasLabel, SidebarNav } from "./sidebar-nav";
import { ThemeToggle } from "./theme-toggle";
import { SidebarAccount, UserMenu } from "./user-menu";

function subHalaman(pathname: string) {
  if (pathname === "/kegiatan/baru") return "Tambah kegiatan";
  if (/^\/kegiatan\/[^/]+\/ubah$/.test(pathname)) return "Ubah kegiatan";
  if (/^\/kegiatan\/[^/]+$/.test(pathname)) return "Detail kegiatan";
  return null;
}

function Breadcrumb({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();
  const aktif = navAktif(groups, pathname, useSearchParams());
  const sub = subHalaman(pathname);
  if (!aktif) return null;
  return (
    <nav aria-label="Breadcrumb" className="hidden min-w-0 sm:block">
      <ol className="flex items-center gap-2 text-sm text-muted-foreground">
        <li className="hidden sm:block">{aktif.group.label}</li>
        <ChevronRight aria-hidden className="hidden size-4 shrink-0 sm:block" />
        {sub ? (
          <>
            <li className="hidden sm:block">
              <Link href={aktif.item.href} className="hover:text-foreground">
                {aktif.item.label}
              </Link>
            </li>
            <ChevronRight aria-hidden className="hidden size-4 shrink-0 sm:block" />
            <li aria-current="page" className="truncate font-semibold text-foreground">
              {sub}
            </li>
          </>
        ) : (
          <li aria-current="page" className="truncate font-semibold text-foreground">
            {aktif.item.label}
          </li>
        )}
      </ol>
    </nav>
  );
}

function IsiSidebar({
  groups,
  lencana,
  isLoading,
  mode,
  collapsed,
  onToggleCollapse,
  onNavigate,
}: {
  groups: NavGroup[];
  lencana?: Record<string, number>;
  isLoading: boolean;
  mode: "responsive" | "full";
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
}) {
  const rail = mode === "responsive";
  const tengahSaatRail = cn(rail && "md:justify-center lg:justify-start", rail && collapsed && "lg:justify-center");
  return (
    <>
      <div
        className={cn(
          "flex items-center gap-2 px-5 pt-6 pb-8",
          tengahSaatRail,
          rail && "md:px-0 lg:px-5",
          rail && collapsed && "lg:flex-col lg:gap-3 lg:px-0",
        )}
      >
        <Brand hideTextClassName={kelasLabel(mode, collapsed)} />
        {onToggleCollapse && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleCollapse}
                aria-label={collapsed ? "Lebarkan sidebar" : "Ciutkan sidebar"}
                className={cn(
                  "hidden size-9 shrink-0 rounded-full text-sidebar-foreground hover:bg-sidebar-group hover:text-sidebar-strong lg:flex",
                  !collapsed && "ml-auto",
                )}
              >
                {collapsed ? <PanelLeftOpen aria-hidden /> : <PanelLeftClose aria-hidden />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10} className="rounded-lg px-3 py-1.5 text-xs font-semibold">
              {collapsed ? "Lebarkan sidebar" : "Ciutkan sidebar"}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className={cn("flex-1 overflow-y-auto px-4 pb-4", rail && "md:px-3 lg:px-4", rail && collapsed && "lg:px-3")}>
        <SidebarNav groups={groups} lencana={lencana} isLoading={isLoading} mode={mode} collapsed={collapsed} onNavigate={onNavigate} />
      </div>
      <div className={cn("p-4", rail && "md:p-3 lg:p-4", rail && collapsed && "lg:p-3")}>
        <SidebarAccount
          hideTextClassName={kelasLabel(mode, collapsed)}
          className={cn(rail && "md:justify-center md:bg-transparent lg:justify-start lg:bg-sidebar-group", rail && collapsed && "lg:justify-center lg:bg-transparent")}
        />
      </div>
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isPending } = useCurrentUser();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const groups = navUntukRole(user?.role);
  const permintaan = useJumlahPermintaan(user?.role === "ADMIN");
  const lencana = { "/admin/akun": permintaan.data?.menunggu ?? 0 };

  // Penanda peran untuk token warna (globals.css): pimpinan mendapat aksen emas
  const peran = user?.role === "PIMPINAN" ? "pimpinan" : null;
  useEffect(() => {
    const akar = document.documentElement;
    if (peran) akar.dataset.peran = peran;
    else delete akar.dataset.peran;
    return () => {
      delete akar.dataset.peran;
    };
  }, [peran]);

  return (
    <div className="flex min-h-dvh">
      {user && <SinkronTema />}
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 p-3 transition-[width] duration-200 ease-out md:block md:w-[92px]",
          collapsed ? "lg:w-[92px]" : "lg:w-72",
        )}
      >
        <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-sidebar-border bg-sidebar shadow-[0_10px_40px_-12px] shadow-slate-900/10 dark:shadow-black/50">
          <IsiSidebar
            groups={groups}
            lencana={lencana}
            isLoading={isPending}
            mode="responsive"
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed((v) => !v)}
          />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b border-border/70 bg-background/85 px-4 backdrop-blur-md md:px-6 lg:px-8">
          <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="size-11 md:hidden" aria-label="Buka menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" showCloseButton={false} className="w-80 gap-0 border-none bg-transparent p-3 shadow-none">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <SheetDescription className="sr-only">Navigasi utama aplikasi</SheetDescription>
              <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-sidebar-border bg-sidebar shadow-xl">
                <IsiSidebar groups={groups} lencana={lencana} isLoading={isPending} mode="full" onNavigate={() => {
                    lepasLapisan();
                    setDrawerOpen(false);
                  }} />
              </div>
            </SheetContent>
          </Sheet>
          <Suspense fallback={null}>
            <Breadcrumb groups={groups} />
          </Suspense>
          <div className="ml-auto flex items-center gap-2">
            <PencarianCepat />
            {/* Notifikasi hasil pemeriksaan hanya untuk pegawai (pencatat kegiatan) */}
            {user?.role === "PEGAWAI" && <LoncengNotifikasi />}
            <ThemeToggle />
            <span aria-hidden className="hidden h-6 w-px bg-border md:block" />
            <UserMenu />
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 md:px-6 md:py-8 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
