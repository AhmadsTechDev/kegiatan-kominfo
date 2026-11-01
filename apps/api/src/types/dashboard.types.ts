import type { DashboardValidator } from "@/validators/dashboard.validator";

export type DashboardQuery = typeof DashboardValidator.query.static;
