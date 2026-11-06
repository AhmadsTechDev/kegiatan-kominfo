import { Elysia } from "elysia";
import { EksporController } from "@/controllers/ekspor.controller";
import { authPlugin } from "@/plugins/auth.plugin";
import { PEMERIKSA } from "@/utils/konstanta";
import { RekapValidator } from "@/validators/rekap.validator";

// Ekspor laporan kegiatan: pimpinan dan admin (pegawai ditolak 403)
export const eksporRoutes = new Elysia({ prefix: "/ekspor" })
  .use(authPlugin)
  // Unduh PDF
  .get("/kegiatan.pdf", EksporController.pdf, { auth: [...PEMERIKSA], query: RekapValidator.query })
  // Kegiatan beserta berkas dokumentasinya pada cakupan yang sama
  .get("/dokumentasi", EksporController.dokumentasi, { auth: [...PEMERIKSA], query: RekapValidator.query })
  // Pratinjau isi laporan dalam JSON
  .get("/pratinjau", EksporController.pratinjau, { auth: [...PEMERIKSA], query: RekapValidator.query });
