import { AppShell } from "@/components/layout/app-shell";

/**
 * Layout grup rute (app): membungkus halaman dengan AppShell
 */

/**
 * Folder bertanda kurung seperti (app) dan (auth) adalah "route group": mengelompokkan halaman tanpa menambah
 * bagian alamat URL. Semua halaman setelah login ada di (app) sehingga otomatis mendapat sidebar dan topbar dari AppShell.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return <AppShell>{children}</AppShell>;
}
