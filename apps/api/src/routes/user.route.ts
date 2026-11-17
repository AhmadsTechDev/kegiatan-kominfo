import { Elysia } from "elysia";
import { authPlugin } from "@/plugins/auth.plugin";
import { UserService } from "@/services/user.service";
import { adminDari } from "@/utils/konteks";
import { UserValidator } from "@/validators/user.validator";

export const userRoutes = new Elysia({ prefix: "/admin/akun" })
  .use(authPlugin)
  .get("/", ({ query }) => UserService.daftar(query), { auth: ["ADMIN"], query: UserValidator.daftarQuery })
  .get("/:id", ({ params }) => UserService.detail(params.id), { auth: ["ADMIN"], params: UserValidator.params })
  .post(
    "/",
    ({ body, set }) => {
      set.status = 201;
      return UserService.buat(body);
    },
    { auth: ["ADMIN"], body: UserValidator.buat },
  )
  .patch("/:id", ({ params, body, user }) => UserService.ubah(params.id, body, adminDari(user)), {
    auth: ["ADMIN"],
    params: UserValidator.params,
    body: UserValidator.ubah,
  })
  .post("/:id/nonaktifkan", ({ params, body, user }) => UserService.nonaktifkan(params.id, body.alasan, adminDari(user)), {
    auth: ["ADMIN"],
    params: UserValidator.params,
    body: UserValidator.nonaktifkan,
  })
  .post("/:id/aktifkan", ({ params }) => UserService.aktifkan(params.id), {
    auth: ["ADMIN"],
    params: UserValidator.params,
  })
  .delete("/:id", ({ params, user }) => UserService.hapus(params.id, adminDari(user)), {
    auth: ["ADMIN"],
    params: UserValidator.params,
  })
  .post("/:id/kirim-ulang-undangan", ({ params }) => UserService.kirimUlangUndangan(params.id), {
    auth: ["ADMIN"],
    params: UserValidator.params,
  })
  .post("/:id/reset-sandi", ({ params, user, session }) => UserService.resetSandi(params.id, adminDari(user, session)), {
    auth: ["ADMIN"],
    params: UserValidator.params,
  })
  .post("/:id/cabut-sesi", ({ params, user, session }) => UserService.cabutSesi(params.id, adminDari(user, session)), {
    auth: ["ADMIN"],
    params: UserValidator.params,
  });
