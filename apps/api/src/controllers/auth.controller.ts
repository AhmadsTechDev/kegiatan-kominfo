import { AkunSayaService } from "@/services/akun-saya.service";
import { AuthService } from "@/services/auth.service";
import { KredensialService } from "@/services/kredensial.service";
import type { AturSandi, GantiEmail, GantiSandi, UbahPreferensi, UbahProfil } from "@/types/auth.types";
import type { Konteks } from "@/types/umum.types";
import { requestMeta } from "@/utils/konteks";

type Token = { token: string };
type Publik<B = unknown, Q = unknown> = Pick<Konteks<B, unknown, Q>, "body" | "query" | "request">;

/**
 * Controller akun milik pengguna yang sedang login dan alur akun publik (aktivasi, lupa sandi).
 * Setiap fungsi menerima konteks permintaan dari Elysia, mengambil bagian yang perlu, lalu menyerahkan pekerjaannya ke service.
 */
export const AuthController = {
  /**
   * ---------- Akun sendiri (login) ----------
   */

  /**
   * GET /api/me
   */
  me: ({ user }: Konteks) => AuthService.profil(user.id),

  /**
   * PATCH /api/me
   */
  ubahProfil: ({ user, request, body }: Konteks<UbahProfil>) => AuthService.ubahProfil(user.id, body, requestMeta(request.headers)),

  /**
   * POST /api/me/foto
   */
  unggahFoto: ({ user, request, body }: Konteks<{ berkas: File }>) => AuthService.unggahFoto(user.id, body.berkas, requestMeta(request.headers)),

  /**
   * DELETE /api/me/foto
   */
  hapusFoto: ({ user, request }: Konteks) => AuthService.hapusFoto(user.id, requestMeta(request.headers)),

  /**
   * GET /api/me/foto/:userId — mengirim gambar WebP (boleh di-cache 1 hari karena URL-nya berversi)
   */
  foto: async ({ params }: Konteks<unknown, { userId: string }>) =>
    new Response(await AuthService.bacaFoto(params.userId), {
      headers: { "Content-Type": "image/webp", "X-Content-Type-Options": "nosniff", "Cache-Control": "private, max-age=86400" },
    }),

  /**
   * PATCH /api/me/email — minta ganti email (perlu verifikasi email baru)
   */
  gantiEmail: ({ user, request, body }: Konteks<GantiEmail>) => KredensialService.mintaGantiEmail(user.id, body, requestMeta(request.headers)),

  /**
   * DELETE /api/me/email — batalkan ganti email yang belum diverifikasi
   */
  batalGantiEmail: ({ user, request }: Konteks) => KredensialService.batalGantiEmail(user.id, requestMeta(request.headers)),

  /**
   * PATCH /api/me/sandi
   */
  gantiSandi: ({ user, session, request, body }: Konteks<GantiSandi>) =>
    AkunSayaService.gantiSandi(user.id, session.id, body, requestMeta(request.headers)),

  /**
   * GET /api/me/sesi
   */
  daftarSesi: ({ user, session }: Konteks) => AkunSayaService.daftarSesi(user.id, session.id),

  /**
   * DELETE /api/me/sesi/:id
   */
  cabutSesi: ({ user, session, params, request }: Konteks<unknown, { id: string }>) =>
    AkunSayaService.cabutSesi(user.id, session.id, params.id, requestMeta(request.headers)),

  /**
   * DELETE /api/me/sesi — cabut semua sesi selain sesi ini
   */
  cabutSesiLain: ({ user, session, request }: Konteks) => AkunSayaService.cabutSesiLain(user.id, session.id, requestMeta(request.headers)),

  /**
   * GET /api/me/preferensi
   */
  preferensi: ({ user }: Konteks) => AkunSayaService.preferensi(user.id),

  /**
   * PATCH /api/me/preferensi
   */
  ubahPreferensi: ({ user, body }: Konteks<UbahPreferensi>) => AkunSayaService.ubahPreferensi(user.id, body),

  /**
   * ---------- Tautan email (tanpa login) ----------
   */

  /**
   * GET /api/aktivasi?token=
   */
  infoAktivasi: ({ query, request }: Publik<unknown, Token>) => KredensialService.infoAktivasi(query.token, requestMeta(request.headers)),

  /**
   * POST /api/aktivasi
   */
  aktivasi: ({ body, request }: Publik<AturSandi>) => KredensialService.aktivasi(body, requestMeta(request.headers)),

  /**
   * POST /api/lupa-sandi
   */
  lupaSandi: ({ body, request }: Publik<{ email: string }>) => KredensialService.lupaSandi(body.email, requestMeta(request.headers)),

  /**
   * GET /api/reset-sandi?token=
   */
  infoReset: ({ query, request }: Publik<unknown, Token>) => KredensialService.infoReset(query.token, requestMeta(request.headers)),

  /**
   * POST /api/reset-sandi
   */
  resetSandi: ({ body, request }: Publik<AturSandi>) => KredensialService.resetSandi(body, requestMeta(request.headers)),

  /**
   * POST /api/konfirmasi-email
   */
  konfirmasiEmail: ({ body, request }: Publik<Token>) => KredensialService.konfirmasiEmail(body.token, requestMeta(request.headers)),
};
