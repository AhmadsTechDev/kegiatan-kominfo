import { Elysia } from "elysia";
import { authPlugin } from "@/plugins/auth.plugin";
import { KegiatanService } from "@/services/kegiatan.service";
import { PEMERIKSA, PENULIS } from "@/utils/konstanta";
import { aktorDari } from "@/utils/konteks";
import { KegiatanValidator } from "@/validators/kegiatan.validator";

export const kegiatanRoutes = new Elysia({ prefix: "/kegiatan" })
  .use(authPlugin)
  .get("/", ({ query, user }) => KegiatanService.daftar(query, aktorDari(user)), {
    auth: true,
    query: KegiatanValidator.daftarQuery,
  })
  .get("/:id", ({ params, user }) => KegiatanService.detail(params.id, aktorDari(user)), {
    auth: true,
    params: KegiatanValidator.params,
  })
  .post(
    "/",
    ({ body, user, set }) => {
      set.status = 201;
      return KegiatanService.buat(body, aktorDari(user));
    },
    { auth: PENULIS, body: KegiatanValidator.buat },
  )
  .patch("/:id", ({ params, body, user }) => KegiatanService.ubah(params.id, body, aktorDari(user)), {
    auth: PENULIS,
    params: KegiatanValidator.params,
    body: KegiatanValidator.ubah,
  })
  .post("/:id/selesai", ({ params, body, user }) => KegiatanService.selesaikan(params.id, body, aktorDari(user)), {
    auth: PENULIS,
    params: KegiatanValidator.params,
    body: KegiatanValidator.selesai,
  })
  .post("/:id/batalkan", ({ params, body, user }) => KegiatanService.batalkan(params.id, body, aktorDari(user)), {
    auth: PENULIS,
    params: KegiatanValidator.params,
    body: KegiatanValidator.batalkan,
  })
  .post("/:id/pemeriksaan", ({ params, body, user }) => KegiatanService.periksa(params.id, body, aktorDari(user)), {
    auth: PEMERIKSA,
    params: KegiatanValidator.params,
    body: KegiatanValidator.periksa,
  })
  .delete(
    "/:id",
    async ({ params, user, set }) => {
      await KegiatanService.hapus(params.id, aktorDari(user));
      set.status = 204;
    },
    { auth: PENULIS, params: KegiatanValidator.params },
  );
