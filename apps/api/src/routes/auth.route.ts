import { Elysia } from "elysia";
import { authPlugin } from "@/plugins/auth.plugin";
import { AkunSayaService } from "@/services/akun-saya.service";
import { AuthService } from "@/services/auth.service";
import { KredensialService } from "@/services/kredensial.service";
import { requestMeta } from "@/utils/konteks";
import { AuthValidator } from "@/validators/auth.validator";

export const authRoutes = new Elysia({ prefix: "/me" })
  .use(authPlugin)
  .get("/", ({ user }) => AuthService.profil(user.id), { auth: true })
  .patch("/", ({ user, body }) => AuthService.ubahProfil(user.id, body), { auth: true, body: AuthValidator.ubahProfil })
  .post("/foto", ({ user, body }) => AuthService.unggahFoto(user.id, body.berkas), { auth: true, body: AuthValidator.unggahFoto })
  .delete("/foto", ({ user }) => AuthService.hapusFoto(user.id), { auth: true })
  .get(
    "/foto/:userId",
    async ({ params }) =>
      new Response(await AuthService.bacaFoto(params.userId), {
        headers: {
          "Content-Type": "image/webp",
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "private, max-age=86400",
        },
      }),
    { auth: true, params: AuthValidator.fotoParams },
  )
  .patch("/email", ({ user, body }) => KredensialService.mintaGantiEmail(user.id, body), { auth: true, body: AuthValidator.gantiEmail })
  .delete("/email", ({ user }) => KredensialService.batalGantiEmail(user.id), { auth: true })
  .patch("/sandi", ({ user, session, body }) => AkunSayaService.gantiSandi(user.id, session.id, body), {
    auth: true,
    body: AuthValidator.gantiSandi,
  })
  .get("/sesi", ({ user, session }) => AkunSayaService.daftarSesi(user.id, session.id), { auth: true })
  .delete("/sesi", ({ user, session }) => AkunSayaService.cabutSesiLain(user.id, session.id), { auth: true })
  .delete("/sesi/:id", ({ user, session, params }) => AkunSayaService.cabutSesi(user.id, session.id, params.id), {
    auth: true,
    params: AuthValidator.sesiParams,
  })
  .get("/preferensi", ({ user }) => AkunSayaService.preferensi(user.id), { auth: true })
  .patch("/preferensi", ({ user, body }) => AkunSayaService.ubahPreferensi(user.id, body), {
    auth: true,
    body: AuthValidator.preferensi,
  });

export const akunPublikRoutes = new Elysia()
  .get("/aktivasi", ({ query, request }) => KredensialService.infoAktivasi(query.token, requestMeta(request.headers)), {
    query: AuthValidator.tokenQuery,
  })
  .post("/aktivasi", ({ body, request }) => KredensialService.aktivasi(body, requestMeta(request.headers)), {
    body: AuthValidator.aturSandi,
  })
  .post("/lupa-sandi", ({ body, request }) => KredensialService.lupaSandi(body.email, requestMeta(request.headers)), {
    body: AuthValidator.lupaSandi,
  })
  .get("/reset-sandi", ({ query, request }) => KredensialService.infoReset(query.token, requestMeta(request.headers)), {
    query: AuthValidator.tokenQuery,
  })
  .post("/reset-sandi", ({ body, request }) => KredensialService.resetSandi(body, requestMeta(request.headers)), {
    body: AuthValidator.aturSandi,
  })
  .post("/konfirmasi-email", ({ body, request }) => KredensialService.konfirmasiEmail(body.token, requestMeta(request.headers)), {
    body: AuthValidator.tokenBody,
  });
