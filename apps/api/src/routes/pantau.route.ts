import { Elysia } from "elysia";
import { PantauController } from "@/controllers/pantau.controller";
import { authPlugin } from "@/plugins/auth.plugin";
import { PantauValidator } from "@/validators/pantau.validator";

// Pantauan status pemeriksaan, khusus pimpinan (PRD Fase 4 "Pantau Pimpinan"); admin memakai Dashboard dan daftar Kegiatan
export const pantauRoutes = new Elysia({ prefix: "/pantau" })
  .use(authPlugin)
  .get("/ringkasan", PantauController.ringkasan, { auth: ["PIMPINAN"], query: PantauValidator.query });
