import { Elysia } from "elysia";
import { MasterController } from "@/controllers/master.controller";
import { authPlugin } from "@/plugins/auth.plugin";
import { MasterValidator } from "@/validators/master.validator";

const ADMIN = { auth: ["ADMIN" as const] };
const params = MasterValidator.params;

// Data master (unit kerja, jenis unit, pegawai, jenis kegiatan), khusus ADMIN
export const masterRoutes = new Elysia({ prefix: "/admin" })
  .use(authPlugin)
  // Unit kerja
  .get("/unit-kerja", MasterController.daftarUnit, ADMIN)
  .post("/unit-kerja", MasterController.buatUnit, { ...ADMIN, body: MasterValidator.buatUnit })
  .patch("/unit-kerja/:id", MasterController.ubahUnit, { ...ADMIN, params, body: MasterValidator.ubahUnit })
  // Jenis unit
  .get("/jenis-unit", MasterController.daftarJenisUnit, ADMIN)
  .post("/jenis-unit", MasterController.buatJenisUnit, { ...ADMIN, body: MasterValidator.buatJenisUnit })
  .patch("/jenis-unit/:id", MasterController.ubahJenisUnit, { ...ADMIN, params, body: MasterValidator.ubahJenisUnit })
  // Pegawai
  .get("/pegawai", MasterController.daftarPegawai, { ...ADMIN, query: MasterValidator.daftarPegawaiQuery })
  .post("/pegawai", MasterController.buatPegawai, { ...ADMIN, body: MasterValidator.buatPegawai })
  .patch("/pegawai/:id", MasterController.ubahPegawai, { ...ADMIN, params, body: MasterValidator.ubahPegawai })
  // Jenis kegiatan
  .get("/jenis-kegiatan", MasterController.daftarJenis, ADMIN)
  .post("/jenis-kegiatan", MasterController.buatJenis, { ...ADMIN, body: MasterValidator.buatJenis })
  .patch("/jenis-kegiatan/:id", MasterController.ubahJenis, { ...ADMIN, params, body: MasterValidator.ubahJenis });
