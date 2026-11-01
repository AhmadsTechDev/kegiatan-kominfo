import { Elysia } from "elysia";
import { PantauController } from "@/controllers/pantau.controller";
import { authPlugin } from "@/plugins/auth.plugin";
import { PantauValidator } from "@/validators/pantau.validator";

// Pantauan status pemeriksaan untuk pimpinan/admin
export const pantauRoutes = new Elysia({ prefix: "/pantau" })
  .use(authPlugin)
  .get("/ringkasan", PantauController.ringkasan, { auth: ["PIMPINAN", "ADMIN"], query: PantauValidator.query });
