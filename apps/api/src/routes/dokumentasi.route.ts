import { Elysia } from "elysia";
import { DokumentasiController } from "@/controllers/dokumentasi.controller";
import { authPlugin } from "@/plugins/auth.plugin";
import { PENULIS } from "@/utils/konstanta";
import { DokumentasiValidator } from "@/validators/dokumentasi.validator";

// Berkas dokumentasi kegiatan (foto/PDF)
export const dokumentasiRoutes = new Elysia()
  .use(authPlugin)
  // Unggah berkas ke kegiatan
  .post("/kegiatan/:id/dokumentasi", DokumentasiController.unggah, {
    auth: [...PENULIS],
    params: DokumentasiValidator.kegiatanParams,
    body: DokumentasiValidator.unggah,
  })
  // Ganti berkas
  .put("/dokumentasi/:id", DokumentasiController.ganti, { auth: [...PENULIS], params: DokumentasiValidator.params, body: DokumentasiValidator.unggah })
  // Lihat/unduh berkas
  .get("/dokumentasi/:id", DokumentasiController.unduh, { auth: true, params: DokumentasiValidator.params, query: DokumentasiValidator.unduhQuery })
  // Hapus berkas
  .delete("/dokumentasi/:id", DokumentasiController.hapus, { auth: [...PENULIS], params: DokumentasiValidator.params });
