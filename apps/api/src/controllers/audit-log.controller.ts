import { AuditLogService } from "@/services/audit-log.service";
import type { AuditLogQuery } from "@/types/audit-log.types";
import type { Konteks } from "@/types/umum.types";

export const AuditLogController = {
  // GET /api/audit-log
  daftar: ({ query }: Konteks<unknown, unknown, AuditLogQuery>) => AuditLogService.daftar(query),

  // GET /api/audit-log/pilihan
  pilihan: () => AuditLogService.pilihan(),

  // GET /api/audit-log/:id
  detail: ({ params }: Konteks<unknown, { id: number }>) => AuditLogService.detail(params.id),
};
