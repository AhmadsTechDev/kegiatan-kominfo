import { Elysia } from "elysia";
import { NotifikasiController } from "@/controllers/notifikasi.controller";
import { authPlugin } from "@/plugins/auth.plugin";
import { NotifikasiValidator } from "@/validators/notifikasi.validator";

/**
 * Notifikasi dalam aplikasi milik user yang sedang masuk (semua role; isinya hanya miliknya sendiri)
 */
export const notifikasiRoutes = new Elysia({ prefix: "/notifikasi" })
  .use(authPlugin)
  .get("/", NotifikasiController.daftar, { auth: true })
  .post("/baca-semua", NotifikasiController.bacaSemua, { auth: true })
  .post("/:id/baca", NotifikasiController.baca, { auth: true, params: NotifikasiValidator.params });
