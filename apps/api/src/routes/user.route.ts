import { Elysia } from "elysia";
import { UserController } from "@/controllers/user.controller";
import { authPlugin } from "@/plugins/auth.plugin";
import { UserValidator } from "@/validators/user.validator";

const ADMIN = { auth: ["ADMIN" as const] };

// Manajemen akun pengguna, khusus ADMIN
export const userRoutes = new Elysia({ prefix: "/admin/akun" })
  .use(authPlugin)
  // Daftar akun
  .get("/", UserController.daftar, { ...ADMIN, query: UserValidator.daftarQuery })
  // Buat akun dengan kata sandi langsung
  .post("/", UserController.buat, { ...ADMIN, body: UserValidator.buat })
  // Ubah akun
  .patch("/:id", UserController.ubah, { ...ADMIN, params: UserValidator.params, body: UserValidator.ubah })
  // Nonaktifkan akun
  .post("/:id/nonaktifkan", UserController.nonaktifkan, { ...ADMIN, params: UserValidator.params, body: UserValidator.nonaktifkan })
  // Aktifkan kembali akun
  .post("/:id/aktifkan", UserController.aktifkan, { ...ADMIN, params: UserValidator.params })
  // Hapus akun yang belum pernah dipakai
  .delete("/:id", UserController.hapus, { ...ADMIN, params: UserValidator.params })
  // Tautkan akun ke pegawai
  .post("/:id/hubungkan-pegawai", UserController.hubungkan, { ...ADMIN, params: UserValidator.params, body: UserValidator.hubungkan })
  // Atur kata sandi baru
  .post("/:id/reset-sandi", UserController.resetSandi, { ...ADMIN, params: UserValidator.params, body: UserValidator.resetSandi });
