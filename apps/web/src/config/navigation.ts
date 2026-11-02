// =============================================================================
// KONFIGURASI STRUKTUR NAVIGASI DAN MENU
// =============================================================================
// Gunanya: Mendefinisikan struktur grup dan item menu navigasi berdasarkan peran
// (role), serta menyediakan helper penentu menu aktif dan breadcrumb.
//
// Isi berkas:
//   - NAV_GROUPS          : daftar kelompok menu navigasi dan batasan role aksesnya.
//   - NAV_KEGIATAN_PEGAWAI: variasi menu khusus pegawai (unit saya dan milik saya).
//   - navUntukRole        : menyaring kelompok dan menu yang diizinkan untuk suatu role.
//   - navAktif            : mencocokkan URL dan query parameter dengan item menu aktif.
//
// Cara kerja:
//   1. navUntukRole memfilter menu sesuai role; khusus PEGAWAI disisipkan menu kegiatan
//      khusus di awal kelompok Operasional.
//   2. navAktif membandingkan pathname dan parameter query, memilih rute yang paling
//      spesifik (skor kecocokan tertinggi) untuk menandai status navigasi aktif.
//
// Catatan penting:
//   - Struktur menu mengikuti DESIGN.md bagian 3 dan prototipe dashboard.
//   - Penyaringan menu di frontend hanya untuk kenyamanan antarmuka pengguna; kontrol
//     otorisasi sebenarnya tetap ditegakkan secara ketat oleh backend.
//
// Dipakai oleh: app-shell.tsx (breadcrumb dan judul) dan sidebar-nav.tsx (tampilan menu).
// =============================================================================

import { Building2, CalendarDays, ClipboardCheck, ClipboardList, Database, FileBarChart2, FileText, LayoutDashboard, Settings, ShieldCheck, UserRound, Users, type LucideIcon } from "lucide-react";
import type { Role } from "@/types/auth";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: Role[];
};

export type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Ringkasan",
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["PEGAWAI", "PIMPINAN", "ADMIN"] }],
  },
  {
    label: "Operasional",
    items: [
      { label: "Kegiatan", href: "/kegiatan", icon: ClipboardList, roles: ["PIMPINAN", "ADMIN"] },
      { label: "Kalender", href: "/kalender", icon: CalendarDays, roles: ["PEGAWAI", "PIMPINAN", "ADMIN"] },
      { label: "Rekap", href: "/rekap", icon: FileBarChart2, roles: ["PEGAWAI", "PIMPINAN", "ADMIN"] },
      { label: "Laporan", href: "/laporan", icon: FileText, roles: ["PEGAWAI", "PIMPINAN", "ADMIN"] },
      { label: "Pantau", href: "/pantau", icon: ClipboardCheck, roles: ["PIMPINAN"] },
    ],
  },
  {
    label: "Administrasi",
    items: [
      { label: "Manajemen akun", href: "/admin/akun", icon: Users, roles: ["ADMIN"] },
      { label: "Master data", href: "/admin/master", icon: Database, roles: ["ADMIN"] },
      { label: "Audit log", href: "/admin/audit-log", icon: ShieldCheck, roles: ["ADMIN"] },
    ],
  },
  {
    label: "Akun",
    items: [{ label: "Pengaturan", href: "/pengaturan", icon: Settings, roles: ["PEGAWAI", "PIMPINAN", "ADMIN"] }],
  },
];

const NAV_KEGIATAN_PEGAWAI: NavItem[] = [
  { label: "Kegiatan unit saya", href: "/kegiatan", icon: Building2, roles: ["PEGAWAI"] },
  { label: "Kegiatan saya", href: "/kegiatan?milik=saya", icon: UserRound, roles: ["PEGAWAI"] },
];

export function navUntukRole(role: Role | undefined): NavGroup[] {
  if (!role) return [];
  return NAV_GROUPS.map((g) => {
    const items = g.items.filter((item) => item.roles.includes(role));
    return { ...g, items: g.label === "Operasional" && role === "PEGAWAI" ? [...NAV_KEGIATAN_PEGAWAI, ...items] : items };
  }).filter((g) => g.items.length > 0);
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
