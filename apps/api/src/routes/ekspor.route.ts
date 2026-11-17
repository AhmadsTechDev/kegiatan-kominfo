import { Elysia } from "elysia";
import { authPlugin } from "@/plugins/auth.plugin";
import { EksporService } from "@/services/ekspor.service";
import { disposisi } from "@/utils/berkas";
import { PEMERIKSA } from "@/utils/konstanta";
import { aktorDari } from "@/utils/konteks";
import { RekapValidator } from "@/validators/rekap.validator";

export const eksporRoutes = new Elysia({ prefix: "/ekspor" })
  .use(authPlugin)
  .get(
    "/kegiatan.pdf",
    async ({ query, user }) => {
      const hasil = await EksporService.buat("pdf", query, { ...aktorDari(user), nama: user.name });
      return new Response(hasil.isi, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${hasil.nama}"`,
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "no-store",
          "X-Jumlah-Kegiatan": String(hasil.jumlah),
        },
      });
    },
    { auth: PEMERIKSA, query: RekapValidator.query },
  )
  .get(
    "/dokumentasi.zip",
    async ({ query, user }) => {
      const hasil = await EksporService.dokumentasiZip(query, { ...aktorDari(user), nama: user.name });
      return new Response(hasil.aliran, {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": disposisi("attachment", hasil.nama),
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "no-store",
        },
      });
    },
    { auth: PEMERIKSA, query: RekapValidator.dokumentasiZipQuery },
  )
  .get("/dokumentasi", ({ query, user }) => EksporService.dokumentasi(query, aktorDari(user)), {
    auth: PEMERIKSA,
    query: RekapValidator.query,
  })
  .get("/pratinjau", ({ query, user }) => EksporService.pratinjau(query, { ...aktorDari(user), nama: user.name }), {
    auth: PEMERIKSA,
    query: RekapValidator.query,
  });
