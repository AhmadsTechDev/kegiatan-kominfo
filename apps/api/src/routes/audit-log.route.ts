import { Elysia } from "elysia";
import { AuditLogController } from "@/controllers/audit-log.controller";
import { authPlugin } from "@/plugins/auth.plugin";
import { AuditLogValidator } from "@/validators/audit-log.validator";

const ADMIN = { auth: ["ADMIN" as const] };

// Riwayat aktivitas (audit log), khusus ADMIN
export const auditLogRoutes = new Elysia({ prefix: "/audit-log" })
  .use(authPlugin)
  .get("/", AuditLogController.daftar, { ...ADMIN, query: AuditLogValidator.daftarQuery })
  .get("/pilihan", AuditLogController.pilihan, ADMIN)
  .get("/:id", AuditLogController.detail, { ...ADMIN, params: AuditLogValidator.params });
