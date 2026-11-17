import { Elysia } from "elysia";
import { authPlugin } from "@/plugins/auth.plugin";
import { MasterService } from "@/services/master.service";
import { MasterValidator } from "@/validators/master.validator";

export const masterRoutes = new Elysia({ prefix: "/admin" })
  .use(authPlugin)
  .get("/bidang", () => MasterService.daftarUnit(), { auth: ["ADMIN"] })
  .post(
    "/bidang",
    ({ body, set }) => {
      set.status = 201;
      return MasterService.buatUnit(body);
    },
    { auth: ["ADMIN"], body: MasterValidator.buatUnit },
  )
  .patch("/bidang/:id", ({ params, body }) => MasterService.ubahUnit(params.id, body), {
    auth: ["ADMIN"],
    params: MasterValidator.params,
    body: MasterValidator.ubahUnit,
  })
  .delete("/bidang/:id", ({ params }) => MasterService.hapusUnit(params.id), {
    auth: ["ADMIN"],
    params: MasterValidator.params,
  })
  .get("/pegawai", ({ query }) => MasterService.daftarPegawai(query), {
    auth: ["ADMIN"],
    query: MasterValidator.daftarPegawaiQuery,
  })
  .post(
    "/pegawai",
    ({ body, set }) => {
      set.status = 201;
      return MasterService.buatPegawaiDenganUndangan(body);
    },
    { auth: ["ADMIN"], body: MasterValidator.buatPegawai },
  )
  .patch("/pegawai/:id", ({ params, body }) => MasterService.ubahPegawai(params.id, body), {
    auth: ["ADMIN"],
    params: MasterValidator.params,
    body: MasterValidator.ubahPegawai,
  })
  .delete("/pegawai/:id", ({ params }) => MasterService.hapusPegawai(params.id), {
    auth: ["ADMIN"],
    params: MasterValidator.params,
  })
  .get("/jenis-kegiatan", () => MasterService.daftarJenis(), { auth: ["ADMIN"] })
  .post(
    "/jenis-kegiatan",
    ({ body, set }) => {
      set.status = 201;
      return MasterService.buatJenis(body);
    },
    { auth: ["ADMIN"], body: MasterValidator.buatJenis },
  )
  .patch("/jenis-kegiatan/:id", ({ params, body }) => MasterService.ubahJenis(params.id, body), {
    auth: ["ADMIN"],
    params: MasterValidator.params,
    body: MasterValidator.ubahJenis,
  });
