import {
  Building2,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Database,
  FileBarChart2,
  FileText,
  LayoutDashboard,
  MessageSquareWarning,
  Settings,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/types/auth";

/**
 * Struktur menu navigasi per role, plus helper menu aktif dan breadcrumb
 */

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

/**
 * tampilkanLabel: kelompok satu menu biasanya tanpa label; isi true agar labelnya tetap tampil
 */
export type NavGroup = { label: string; items: NavItem[]; tampilkanLabel?: boolean };

/**
 * Admin: struktur lama dipertahankan
 */
const NAV_ADMIN: NavGroup[] = [
  { label: "Ringkasan", items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }] },
  {
    label: "Operasional",
    items: [
      { label: "Kegiatan", href: "/kegiatan", icon: ClipboardList },
      { label: "Kalender", href: "/kalender", icon: CalendarDays },
      { label: "Rekap", href: "/rekap", icon: FileBarChart2 },
      { label: "Laporan", href: "/laporan", icon: FileText },
      { label: "Pantau", href: "/pantau", icon: ClipboardCheck },
    ],
  },
  {
    label: "Administrasi",
    items: [
      { label: "Manajemen akun", href: "/admin/akun", icon: Users },
      { label: "Master data", href: "/admin/master", icon: Database },
    ],
  },
];

/**
 * Pimpinan: memantau seluruh kegiatan lintas bidang, lalu memeriksa dan memberi catatan perbaikan
 */
const NAV_PIMPINAN: NavGroup[] = [
  {
    label: "Monitoring",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Semua kegiatan", href: "/kegiatan", icon: ClipboardList },
      { label: "Kalender", href: "/kalender", icon: CalendarDays },
      { label: "Rekap", href: "/rekap", icon: FileBarChart2 },
      { label: "Laporan", href: "/laporan", icon: FileText },
    ],
  },
  { label: "Pengawasan", tampilkanLabel: true, items: [{ label: "Pemeriksaan kegiatan", href: "/pantau", icon: ClipboardCheck }] },
];

/**
 * Pegawai: Dashboard di paling atas seperti role lain; tanpa Rekap dan Laporan (ditolak juga oleh backend)
 */
const NAV_PEGAWAI: NavGroup[] = [
  { label: "Ringkasan", items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }] },
  {
    label: "Kegiatan",
    items: [
      { label: "Kegiatan saya", href: "/kegiatan?milik=saya", icon: UserRound },
      { label: "Semua kegiatan", href: "/kegiatan", icon: Building2 },
      { label: "Kalender", href: "/kalender", icon: CalendarDays },
      { label: "Perlu perbaikan", href: "/kegiatan?milik=saya&pemeriksaan=perlu_perbaikan", icon: MessageSquareWarning },
    ],
  },
];

const NAV_AKUN: NavGroup = { label: "Akun", items: [{ label: "Pengaturan", href: "/pengaturan", icon: Settings }] };

const NAV_ROLE: Record<Role, NavGroup[]> = { ADMIN: NAV_ADMIN, PIMPINAN: NAV_PIMPINAN, PEGAWAI: NAV_PEGAWAI };

export function navUntukRole(role: Role | undefined): NavGroup[] {
  if (!role) return [];
  return [...NAV_ROLE[role], NAV_AKUN];
}

export function navAktif(groups: NavGroup[], pathname: string, search?: URLSearchParams | null) {
  let terbaik: { group: NavGroup; item: NavItem; skor: number } | null = null;
  for (const group of groups) {
    for (const item of group.items) {
      const [path, qs] = item.href.split("?");
      if (pathname !== path && !pathname.startsWith(`${path}/`)) continue;
      const syarat = [...new URLSearchParams(qs ?? "")];
      if (syarat.length > 0 && (pathname !== path || !syarat.every(([k, v]) => search?.get(k) === v))) continue;
      if (!terbaik || syarat.length > terbaik.skor) terbaik = { group, item, skor: syarat.length };
    }
  }
  return terbaik && { group: terbaik.group, item: terbaik.item };
}
