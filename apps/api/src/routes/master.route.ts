import { Elysia } from "elysia";
import { MasterController } from "@/controllers/master.controller";
import { authPlugin } from "@/plugins/auth.plugin";
import { MasterValidator } from "@/validators/master.validator";

const ADMIN = { auth: ["ADMIN" as const] };
const params = MasterValidator.params;

/**
 * Data master (bidang dan sub bidang, pegawai, jenis kegiatan), khusus ADMIN
 */
export const masterRoutes = new Elysia({ prefix: "/admin" })
  .use(authPlugin)

  /**
   * Bidang
   */
  .get("/bidang", MasterController.daftarUnit, ADMIN)
  .post("/bidang", MasterController.buatUnit, { ...ADMIN, body: MasterValidator.buatUnit })
  .patch("/bidang/:id", MasterController.ubahUnit, { ...ADMIN, params, body: MasterValidator.ubahUnit })
  .delete("/bidang/:id", MasterController.hapusUnit, { ...ADMIN, params })

  /**
   * Pegawai
   */
  .get("/pegawai", MasterController.daftarPegawai, { ...ADMIN, query: MasterValidator.daftarPegawaiQuery })
  .post("/pegawai", MasterController.buatPegawai, { ...ADMIN, body: MasterValidator.buatPegawai })
  .patch("/pegawai/:id", MasterController.ubahPegawai, { ...ADMIN, params, body: MasterValidator.ubahPegawai })

  /**
   * Hapus pegawai yang belum punya akun dan belum dipakai (mis. salah input di tab Perlu diundang)
   */
  .delete("/pegawai/:id", MasterController.hapusPegawai, { ...ADMIN, params })

  /**
   * Jenis kegiatan
   */
  .get("/jenis-kegiatan", MasterController.daftarJenis, ADMIN)
  .post("/jenis-kegiatan", MasterController.buatJenis, { ...ADMIN, body: MasterValidator.buatJenis })
  .patch("/jenis-kegiatan/:id", MasterController.ubahJenis, { ...ADMIN, params, body: MasterValidator.ubahJenis });
