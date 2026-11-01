import { t } from "elysia";

export const DashboardValidator = {
  query: t.Object({
    periode: t.Optional(t.String({ pattern: "^\d{4}-(0[1-9]|1[0-2])$", error: "Periode harus berformat YYYY-MM" })),
  }),
};
