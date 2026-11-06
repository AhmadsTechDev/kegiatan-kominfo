import { AuditLogService } from "@/services/audit-log.service";
import type { AuditLogQuery } from "@/types/audit-log.types";
import type { Konteks } from "@/types/umum.types";

/**
 * Controller audit log (riwayat aksi pengguna, khusus admin).
 * Setiap fungsi menerima konteks permintaan dari Elysia, mengambil bagian yang perlu, lalu menyerahkan pekerjaannya ke service.
 */
export const AuditLogController = {
  /**
   * GET /api/audit-log
   */
  daftar: ({ query }: Konteks<unknown, unknown, AuditLogQuery>) => AuditLogService.daftar(query),

  /**
   * GET /api/audit-log/pilihan
   */
  pilihan: () => AuditLogService.pilihan(),

  /**
   * GET /api/audit-log/:id
   */
  detail: ({ params }: Konteks<unknown, { id: number }>) => AuditLogService.detail(params.id),
};
