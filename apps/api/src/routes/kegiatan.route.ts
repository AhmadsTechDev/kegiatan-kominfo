import { Elysia } from "elysia";
import { KegiatanController } from "@/controllers/kegiatan.controller";
import { authPlugin } from "@/plugins/auth.plugin";
import { PENULIS } from "@/utils/konstanta";
import { KegiatanValidator } from "@/validators/kegiatan.validator";

const params = KegiatanValidator.params;

export const kegiatanRoutes = new Elysia({ prefix: "/kegiatan" })
  .use(authPlugin)
  // Daftar kegiatan (PEGAWAI hanya melihat bidangnya dan kegiatan miliknya)
  .get("/", KegiatanController.daftar, { auth: true, query: KegiatanValidator.daftarQuery })
  // Detail kegiatan
  .get("/:id", KegiatanController.detail, { auth: true, params })
  // Catat kegiatan baru
  .post("/", KegiatanController.buat, { auth: [...PENULIS], body: KegiatanValidator.buat })
  // Ubah kegiatan
  .patch("/:id", KegiatanController.ubah, { auth: [...PENULIS], params, body: KegiatanValidator.ubah })
  // Batalkan kegiatan
  .post("/:id/batalkan", KegiatanController.batalkan, { auth: [...PENULIS], params, body: KegiatanValidator.batalkan })
  // Periksa kegiatan: hanya pimpinan (PRD Fase 4 "Pantau Pimpinan"); admin mengelola data, bukan menilai isi kegiatan
  .post("/:id/pemeriksaan", KegiatanController.periksa, { auth: ["PIMPINAN"], params, body: KegiatanValidator.periksa })
  // Hapus kegiatan
  .delete("/:id", KegiatanController.hapus, { auth: [...PENULIS], params });
