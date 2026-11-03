import { t } from "elysia";
import { ROLES, STATUS_PERMINTAAN } from "@/utils/konstanta";

export const PermintaanAkunValidator = {
  params: t.Object({ id: t.Numeric({ minimum: 1, error: "ID permintaan tidak valid" }) }),
  ajukan: t.Object({
    nama: t.String({ minLength: 1, maxLength: 150, error: "Nama wajib diisi, maksimal 150 karakter" }),
    nip: t.Optional(t.Nullable(t.String({ pattern: "^(\\d{18})?$", error: "NIP harus 18 digit angka" }))),
    email: t.String({ format: "email", maxLength: 255, error: "Email tidak valid" }),
    catatan: t.Optional(t.Nullable(t.String({ maxLength: 500, error: "Catatan maksimal 500 karakter" }))),
  }),
  daftarQuery: t.Object({
    status: t.Optional(t.Union(STATUS_PERMINTAAN.map((s) => t.Literal(s)), { error: "Status tidak valid" })),
    page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
    pageSize: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20 })),
  }),
  setujui: t.Object({
    role: t.UnionEnum(ROLES, { error: "Role tidak valid" }),
    email: t.Optional(t.String({ format: "email", maxLength: 255, error: "Email tidak valid" })),
    bidangId: t.Optional(t.Integer({ minimum: 1, error: "Bidang tidak valid" })),
  }),
  tolak: t.Object({ alasan: t.String({ minLength: 1, maxLength: 500, error: "Alasan penolakan wajib diisi" }) }),
};
