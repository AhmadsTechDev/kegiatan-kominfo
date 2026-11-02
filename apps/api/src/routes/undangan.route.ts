import { Elysia } from "elysia";
import { UndanganController } from "@/controllers/undangan.controller";
import { authPlugin } from "@/plugins/auth.plugin";
import { UndanganValidator } from "@/validators/undangan.validator";

export const undanganRoutes = new Elysia()
  .use(authPlugin)
  // Admin mengundang pegawai membuat akun (email berisi tautan aktivasi)
  .post("/admin/pegawai/:id/undang", UndanganController.undang, {
    auth: ["ADMIN"],
    params: UndanganValidator.params,
    body: UndanganValidator.undang,
  });
