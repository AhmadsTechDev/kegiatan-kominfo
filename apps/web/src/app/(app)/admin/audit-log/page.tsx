// =============================================================================
// HALAMAN RIWAYAT JEJAK AUDIT (AUDIT LOG)
// =============================================================================
// Gunanya: Menyediakan antarmuka bagi admin untuk memantau rekam jejak aktivitas
// pengguna di Aplikasi Pendataan Kegiatan, seperti perubahan data dan login.
//
// Isi berkas:
//   - metadata     : judul tab peramban untuk halaman audit log
//   - AuditLogPage : komponen utama halaman yang merender tampilan AuditLogView
//
// Dipakai oleh: Next.js App Router untuk rute /admin/audit-log
// =============================================================================

import type { Metadata } from "next";
import { AuditLogView } from "@/features/admin/components/audit-log-view";

export const metadata: Metadata = { title: "Audit log" };

export default function AuditLogPage() {
  return <AuditLogView />;
}
