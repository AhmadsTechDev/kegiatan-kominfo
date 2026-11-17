import { Elysia } from "elysia";
import { authPlugin } from "@/plugins/auth.plugin";
import { DashboardService } from "@/services/dashboard.service";
import { aktorDari } from "@/utils/konteks";
import { parsePeriode } from "@/utils/periode";
import { DashboardValidator } from "@/validators/dashboard.validator";

export const dashboardRoutes = new Elysia({ prefix: "/dashboard" })
  .use(authPlugin)
  .get("/", ({ query, user }) => DashboardService.ringkasan(parsePeriode(query.periode), aktorDari(user)), {
    auth: ["PIMPINAN", "ADMIN"],
    query: DashboardValidator.query,
  })
  .get("/saya", ({ user }) => DashboardService.saya(aktorDari(user)), { auth: true });
