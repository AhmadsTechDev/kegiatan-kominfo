import { t } from "elysia";

export const NotifikasiValidator = {
  params: t.Object({ id: t.Numeric({ minimum: 1, error: "ID notifikasi tidak valid" }) }),
};
