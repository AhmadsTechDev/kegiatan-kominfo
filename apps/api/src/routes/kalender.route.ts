import { Elysia } from "elysia";
import { KalenderController } from "@/controllers/kalender.controller";
import { authPlugin } from "@/plugins/auth.plugin";
import { KalenderValidator } from "@/validators/kalender.validator";

/**
 * Kalender kegiatan bulanan, semua role
 */
export const kalenderRoutes = new Elysia({ prefix: "/kalender" })
  .use(authPlugin)
  .get("/", KalenderController.bulan, { auth: true, query: KalenderValidator.query });
