import { Elysia } from "elysia";
import { authPlugin } from "@/plugins/auth.plugin";
import { ReferensiService } from "@/services/referensi.service";

export const referensiRoutes = new Elysia({ prefix: "/referensi" })
  .use(authPlugin)
  .get("/", () => ReferensiService.semua(), { auth: true });
