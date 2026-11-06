import type { Metadata } from "next";
import { AuditLogView } from "@/features/admin/components/audit-log-view";

// Halaman audit log aktivitas pengguna untuk admin (/admin/audit-log)

export const metadata: Metadata = { title: "Audit log" };

export default function AuditLogPage() {
  return <AuditLogView />;
}
