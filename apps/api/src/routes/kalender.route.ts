import { Elysia } from "elysia";
import { authPlugin } from "@/plugins/auth.plugin";
import { KalenderService } from "@/services/kalender.service";
import { aktorDari } from "@/utils/konteks";
import { KalenderValidator } from "@/validators/kalender.validator";

export const kalenderRoutes = new Elysia({ prefix: "/kalender" })
  .use(authPlugin)
  .get("/", ({ query, user }) => KalenderService.bulan(query.bulan, aktorDari(user)), {
    auth: true,
    query: KalenderValidator.query,
  });
