import { t } from "elysia";
import { AKSI_AUDIT } from "@/utils/konstanta";

/**
 * Tanggal opsional berformat YYYY-MM-DD
 */
const tanggal = (pesan: string) => t.Optional(t.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$", error: pesan }));

export const AuditLogValidator = {
  params: t.Object({ id: t.Numeric({ minimum: 1, error: "ID audit log tidak valid" }) }),

  daftarQuery: t.Object({
    aktor: t.Optional(t.String({ maxLength: 36, error: "Aktor tidak valid" })),
    aksi: t.Optional(t.Union(AKSI_AUDIT.map((a) => t.Literal(a)), { error: "Aksi tidak valid" })),
    entitas: t.Optional(t.String({ maxLength: 50, error: "Entitas tidak valid" })),
    dari: tanggal("Tanggal awal harus berformat YYYY-MM-DD"),
    sampai: tanggal("Tanggal akhir harus berformat YYYY-MM-DD"),
    page: t.Optional(t.Numeric({ minimum: 1, default: 1, error: "Halaman tidak valid" })),
    pageSize: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 25, error: "Ukuran halaman 1 sampai 100" })),
  }),
};
