import { Elysia } from "elysia";
import { PermintaanAkunController } from "@/controllers/permintaan-akun.controller";
import { authPlugin } from "@/plugins/auth.plugin";
import { PermintaanAkunValidator } from "@/validators/permintaan-akun.validator";

const ADMIN = { auth: ["ADMIN" as const] };
const params = PermintaanAkunValidator.params;

export const permintaanAkunRoutes = new Elysia()
  .use(authPlugin)
  // Mengajukan permintaan akun dari halaman login (tanpa login)
  .post("/permintaan-akun", PermintaanAkunController.ajukan, { body: PermintaanAkunValidator.ajukan })
  // Daftar permintaan akun (admin)
  .get("/admin/permintaan-akun", PermintaanAkunController.daftar, { ...ADMIN, query: PermintaanAkunValidator.daftarQuery })
  // Jumlah permintaan yang menunggu (admin)
  .get("/admin/permintaan-akun/jumlah", PermintaanAkunController.jumlah, ADMIN)
  // Setujui permintaan (admin)
  .post("/admin/permintaan-akun/:id/setujui", PermintaanAkunController.setujui, { ...ADMIN, params, body: PermintaanAkunValidator.setujui })
  // Tolak permintaan (admin)
  .post("/admin/permintaan-akun/:id/tolak", PermintaanAkunController.tolak, { ...ADMIN, params, body: PermintaanAkunValidator.tolak });
