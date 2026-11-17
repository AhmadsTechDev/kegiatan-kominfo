import { Elysia } from "elysia";
import { authPlugin } from "@/plugins/auth.plugin";
import { DrafKegiatanService } from "@/services/draf-kegiatan.service";
import { PENULIS } from "@/utils/konstanta";
import { DrafKegiatanValidator } from "@/validators/draf-kegiatan.validator";

export const drafKegiatanRoutes = new Elysia({ prefix: "/draf-kegiatan" })
  .use(authPlugin)
  .get("/", ({ user }) => DrafKegiatanService.daftar(user.id), { auth: PENULIS })
  .get("/:id", ({ params, user }) => DrafKegiatanService.detail(params.id, user.id), {
    auth: PENULIS,
    params: DrafKegiatanValidator.params,
  })
  .post(
    "/",
    ({ body, user, set }) => {
      set.status = 201;
      return DrafKegiatanService.buat(user.id, body.isi);
    },
    { auth: PENULIS, body: DrafKegiatanValidator.simpan },
  )
  .put("/:id", ({ params, body, user }) => DrafKegiatanService.ubah(params.id, user.id, body.isi), {
    auth: PENULIS,
    params: DrafKegiatanValidator.params,
    body: DrafKegiatanValidator.simpan,
  })
  .delete(
    "/:id",
    async ({ params, user, set }) => {
      await DrafKegiatanService.hapus(params.id, user.id);
      set.status = 204;
    },
    { auth: PENULIS, params: DrafKegiatanValidator.params },
  );
