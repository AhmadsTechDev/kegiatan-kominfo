import { Elysia } from "elysia";
import { authPlugin } from "@/plugins/auth.plugin";
import { PermintaanAkunService } from "@/services/permintaan-akun.service";
import { adminDari, requestMeta } from "@/utils/konteks";
import { PermintaanAkunValidator } from "@/validators/permintaan-akun.validator";

export const permintaanAkunRoutes = new Elysia()
  .use(authPlugin)
  .post(
    "/permintaan-akun",
    ({ body, request, set }) => {
      set.status = 201;
      return PermintaanAkunService.ajukan(body, requestMeta(request.headers));
    },
    { body: PermintaanAkunValidator.ajukan },
  )
  .get("/admin/permintaan-akun", ({ query }) => PermintaanAkunService.daftar(query), {
    auth: ["ADMIN"],
    query: PermintaanAkunValidator.daftarQuery,
  })
  .get("/admin/permintaan-akun/jumlah", async () => ({ menunggu: await PermintaanAkunService.jumlahMenunggu() }), {
    auth: ["ADMIN"],
  })
  .post("/admin/permintaan-akun/:id/setujui", ({ params, body, user }) => PermintaanAkunService.setujui(params.id, body, adminDari(user)), {
    auth: ["ADMIN"],
    params: PermintaanAkunValidator.params,
    body: PermintaanAkunValidator.setujui,
  })
  .post("/admin/permintaan-akun/:id/tolak", ({ params, body, user }) => PermintaanAkunService.tolak(params.id, body.alasan, adminDari(user)), {
    auth: ["ADMIN"],
    params: PermintaanAkunValidator.params,
    body: PermintaanAkunValidator.tolak,
  });
