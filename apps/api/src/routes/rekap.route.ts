import { Elysia } from "elysia";
import { RekapController } from "@/controllers/rekap.controller";
import { authPlugin } from "@/plugins/auth.plugin";
import { PEMERIKSA } from "@/utils/konstanta";
import { RekapValidator } from "@/validators/rekap.validator";

// Rekap jumlah kegiatan: pimpinan dan admin (pegawai ditolak 403)
export const rekapRoutes = new Elysia({ prefix: "/rekap" })
  .use(authPlugin)
  .get("/", RekapController.rekap, { auth: [...PEMERIKSA], query: RekapValidator.rekapQuery });
