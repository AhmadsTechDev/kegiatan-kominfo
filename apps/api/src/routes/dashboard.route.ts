import { Elysia } from "elysia";
import { DashboardController } from "@/controllers/dashboard.controller";
import { authPlugin } from "@/plugins/auth.plugin";
import { DashboardValidator } from "@/validators/dashboard.validator";

export const dashboardRoutes = new Elysia({ prefix: "/dashboard" })
  .use(authPlugin)
  // Dashboard bulanan untuk pimpinan/admin
  .get("/", DashboardController.ringkasan, { auth: ["PIMPINAN", "ADMIN"], query: DashboardValidator.query })
  // Beranda pribadi, semua role
  .get("/saya", DashboardController.saya, { auth: true });
