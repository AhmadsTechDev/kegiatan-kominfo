import { Elysia } from "elysia";
import { authPlugin } from "@/plugins/auth.plugin";
import { DokumentasiService } from "@/services/dokumentasi.service";
import { disposisi } from "@/utils/berkas";
import { PENGHAPUS_DOKUMENTASI, PENULIS } from "@/utils/konstanta";
import { aktorDari } from "@/utils/konteks";
import { DokumentasiValidator } from "@/validators/dokumentasi.validator";

export const dokumentasiRoutes = new Elysia()
  .use(authPlugin)
  .post(
    "/kegiatan/:id/dokumentasi",
    async ({ params, body, user, set }) => {
      const hasil = await DokumentasiService.unggah(params.id, body.berkas, aktorDari(user));
      set.status = 201;
      return hasil;
    },
    { auth: PENULIS, params: DokumentasiValidator.kegiatanParams, body: DokumentasiValidator.unggah },
  )
  .put(
    "/dokumentasi/:id",
    ({ params, body, user }) => DokumentasiService.ganti(params.id, body.berkas, aktorDari(user)),
    { auth: PENULIS, params: DokumentasiValidator.params, body: DokumentasiValidator.unggah },
  )
  .get(
    "/dokumentasi/:id",
    async ({ params, query, user }) => {
      const d = await DokumentasiService.unduh(params.id, aktorDari(user));
      return new Response(d.berkas, {
        headers: {
          "Content-Type": d.mime,
          "Content-Length": String(d.berkas.size),
          "Content-Disposition": disposisi(query.unduh ? "attachment" : "inline", d.namaAsli),
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "private, max-age=3600",
          ETag: `"${d.sha256}"`,
        },
      });
    },
    { auth: true, params: DokumentasiValidator.params, query: DokumentasiValidator.unduhQuery },
  )
  .delete(
    "/dokumentasi/:id",
    async ({ params, user, set }) => {
      await DokumentasiService.hapus(params.id, aktorDari(user));
      set.status = 204;
    },
    { auth: PENGHAPUS_DOKUMENTASI, params: DokumentasiValidator.params },
  );
