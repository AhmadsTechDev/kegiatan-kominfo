import { Elysia } from "elysia";
import { authPlugin } from "@/plugins/auth.plugin";
import { PantauService } from "@/services/pantau.service";
import { PEMERIKSA } from "@/utils/konstanta";
import { aktorDari } from "@/utils/konteks";
import { PantauValidator } from "@/validators/pantau.validator";

export const pantauRoutes = new Elysia({ prefix: "/pantau" })
  .use(authPlugin)
  .get("/ringkasan", ({ query, user }) => PantauService.ringkasan(query, aktorDari(user)), {
    auth: PEMERIKSA,
    query: PantauValidator.query,
  });
