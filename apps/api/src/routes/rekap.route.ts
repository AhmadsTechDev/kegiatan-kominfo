import { Elysia } from "elysia";
import { authPlugin } from "@/plugins/auth.plugin";
import { RekapService } from "@/services/rekap.service";
import { PEMERIKSA } from "@/utils/konstanta";
import { aktorDari } from "@/utils/konteks";
import { RekapValidator } from "@/validators/rekap.validator";

export const rekapRoutes = new Elysia({ prefix: "/rekap" })
  .use(authPlugin)
  .get("/", ({ query, user }) => RekapService.rekap(query, aktorDari(user)), {
    auth: PEMERIKSA,
    query: RekapValidator.rekapQuery,
  });
