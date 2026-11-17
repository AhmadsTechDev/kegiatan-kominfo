import { Elysia } from "elysia";
import { authPlugin } from "@/plugins/auth.plugin";
import { UndanganService } from "@/services/undangan.service";
import { UndanganValidator } from "@/validators/undangan.validator";

export const undanganRoutes = new Elysia()
  .use(authPlugin)
  .post(
    "/admin/pegawai/:id/undang",
    ({ params, body }) => UndanganService.undang({ pegawaiId: params.id, email: body.email, role: body.role }),
    {
      auth: ["ADMIN"],
      params: UndanganValidator.params,
      body: UndanganValidator.undang,
    },
  );
