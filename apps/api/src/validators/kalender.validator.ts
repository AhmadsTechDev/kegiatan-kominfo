import { t } from "elysia";

export const KalenderValidator = {
  query: t.Object({
    bulan: t.Optional(t.String({ pattern: "^\\d{4}-(0[1-9]|1[0-2])$", error: "Bulan harus berformat YYYY-MM" })),
  }),
};
