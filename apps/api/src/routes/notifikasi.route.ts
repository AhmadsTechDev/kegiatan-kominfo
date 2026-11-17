import { Elysia } from "elysia";
import { authPlugin } from "@/plugins/auth.plugin";
import { NotifikasiService } from "@/services/notifikasi.service";
import { NotifikasiValidator } from "@/validators/notifikasi.validator";

export const notifikasiRoutes = new Elysia({ prefix: "/notifikasi" })
  .use(authPlugin)
  .get("/", ({ user }) => NotifikasiService.daftar(user.id), { auth: true })
  .post("/baca-semua", ({ user }) => NotifikasiService.baca(user.id), { auth: true })
  .post("/:id/baca", ({ params, user }) => NotifikasiService.baca(user.id, params.id), {
    auth: true,
    params: NotifikasiValidator.params,
  });
