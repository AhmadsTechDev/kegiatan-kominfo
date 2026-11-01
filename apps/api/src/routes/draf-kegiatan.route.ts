import { Elysia } from "elysia";
import { DrafKegiatanController } from "@/controllers/draf-kegiatan.controller";
import { authPlugin } from "@/plugins/auth.plugin";
import { PENULIS } from "@/utils/konstanta";
import { DrafKegiatanValidator } from "@/validators/draf-kegiatan.validator";

const params = DrafKegiatanValidator.params;

// Draf formulir kegiatan milik user sendiri
export const drafKegiatanRoutes = new Elysia({ prefix: "/draf-kegiatan" })
  .use(authPlugin)
  .get("/", DrafKegiatanController.daftar, { auth: [...PENULIS] })
  .get("/:id", DrafKegiatanController.detail, { auth: [...PENULIS], params })
  .post("/", DrafKegiatanController.buat, { auth: [...PENULIS], body: DrafKegiatanValidator.simpan })
  .put("/:id", DrafKegiatanController.ubah, { auth: [...PENULIS], params, body: DrafKegiatanValidator.simpan })
  .delete("/:id", DrafKegiatanController.hapus, { auth: [...PENULIS], params });
