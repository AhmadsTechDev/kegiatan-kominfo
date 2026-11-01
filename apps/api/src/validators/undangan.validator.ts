import { t } from "elysia";
import { ROLES } from "@/utils/konstanta";

export const UndanganValidator = {
  params: t.Object({ id: t.Numeric({ minimum: 1, error: "ID pegawai tidak valid" }) }),
  undang: t.Object({
    email: t.String({ format: "email", maxLength: 255, error: "Email tidak valid" }),
    role: t.UnionEnum(ROLES, { error: "Role tidak valid" }),
  }),
  aktivasiQuery: t.Object({ token: t.String({ minLength: 10, maxLength: 100, error: "Token tidak valid" }) }),
};
