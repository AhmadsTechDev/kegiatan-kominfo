import { AppShell } from "@/components/layout/app-shell";

// Layout grup rute (app): membungkus halaman dengan AppShell

export default function AppLayout({ children }: LayoutProps<"/">) {
  return <AppShell>{children}</AppShell>;
}
