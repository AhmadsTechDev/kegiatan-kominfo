import type { AuditLogValidator } from "@/validators/audit-log.validator";
import type { AksiAudit } from "./umum.types";

export type AuditLogQuery = typeof AuditLogValidator.daftarQuery.static;

/**
 * Data yang dikirim service saat mencatat audit
 */
export type CatatAuditInput = {
  aktorId: string | null;
  aksi: AksiAudit;
  entitas: string;
  entitasId?: string | number | null;
  sebelum?: unknown;
  sesudah?: unknown;
  ip?: string | null;
  userAgent?: string | null;
};

export type FilterAudit = { aktorId?: string; aksi?: string; entitas?: string; dari?: Date; sampai?: Date };
