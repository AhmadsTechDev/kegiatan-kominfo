import { Elysia } from "elysia";
import { UserController } from "@/controllers/user.controller";
import { authPlugin } from "@/plugins/auth.plugin";
import { UserValidator } from "@/validators/user.validator";

const ADMIN = { auth: ["ADMIN" as const] };
const params = UserValidator.params;

/**
 * Manajemen akun pengguna, khusus ADMIN
 */
export const userRoutes = new Elysia({ prefix: "/admin/akun" })
  .use(authPlugin)

  /**
   * Daftar akun (cari nama/email/NIP, filter role dan status)
   */
  .get("/", UserController.daftar, { ...ADMIN, query: UserValidator.daftarQuery })

  /**
   * Detail akun
   */
  .get("/:id", UserController.detail, { ...ADMIN, params })

  /**
   * Buat akun dan kirim undangan aktivasi
   */
  .post("/", UserController.buat, { ...ADMIN, body: UserValidator.buat })

  /**
   * Ubah akun dan data pegawainya
   */
  .patch("/:id", UserController.ubah, { ...ADMIN, params, body: UserValidator.ubah })

  /**
   * Nonaktifkan akun
   */
  .post("/:id/nonaktifkan", UserController.nonaktifkan, { ...ADMIN, params, body: UserValidator.nonaktifkan })

  /**
   * Aktifkan kembali akun
   */
  .post("/:id/aktifkan", UserController.aktifkan, { ...ADMIN, params })

  /**
   * Hapus akun yang belum meninggalkan data kegiatan
   */
  .delete("/:id", UserController.hapus, { ...ADMIN, params })

  /**
   * Kirim ulang undangan aktivasi
   */
  .post("/:id/kirim-ulang-undangan", UserController.kirimUlangUndangan, { ...ADMIN, params })

  /**
   * Kirim tautan atur ulang kata sandi ke email pemilik akun
   */
  .post("/:id/reset-sandi", UserController.resetSandi, { ...ADMIN, params })

  /**
   * Cabut semua sesi login akun
   */
  .post("/:id/cabut-sesi", UserController.cabutSesi, { ...ADMIN, params });
