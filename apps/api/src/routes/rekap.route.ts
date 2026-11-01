import { Elysia } from "elysia";
import { RekapController } from "@/controllers/rekap.controller";
import { authPlugin } from "@/plugins/auth.plugin";
import { RekapValidator } from "@/validators/rekap.validator";

// Rekap jumlah kegiatan, semua role
export const rekapRoutes = new Elysia({ prefix: "/rekap" })
  .use(authPlugin)
  .get("/", RekapController.rekap, { auth: true, query: RekapValidator.rekapQuery });
