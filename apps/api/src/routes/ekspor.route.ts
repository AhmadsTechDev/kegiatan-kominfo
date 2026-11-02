import { Elysia } from "elysia";
import { EksporController } from "@/controllers/ekspor.controller";
import { authPlugin } from "@/plugins/auth.plugin";
import { RekapValidator } from "@/validators/rekap.validator";

// Ekspor laporan kegiatan, semua role (isi mengikuti lingkup baca masing-masing)
export const eksporRoutes = new Elysia({ prefix: "/ekspor" })
  .use(authPlugin)
  // Unduh PDF
  .get("/kegiatan.pdf", EksporController.pdf, { auth: true, query: RekapValidator.query })
  // Pratinjau isi laporan dalam JSON
  .get("/pratinjau", EksporController.pratinjau, { auth: true, query: RekapValidator.query });
