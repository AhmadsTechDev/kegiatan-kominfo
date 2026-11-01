import { AuthService } from "@/services/auth.service";
import type { UbahProfil } from "@/types/auth.types";
import type { Konteks } from "@/types/umum.types";
import { requestMeta } from "@/utils/konteks";

export const AuthController = {
  // GET /api/me
  me: ({ user }: Konteks) => AuthService.profil(user.id),

  // PATCH /api/me
  ubahProfil: ({ user, request, body }: Konteks<UbahProfil>) => AuthService.ubahProfil(user.id, body, requestMeta(request.headers)),

  // POST /api/me/foto
  unggahFoto: ({ user, request, body }: Konteks<{ berkas: File }>) => AuthService.unggahFoto(user.id, body.berkas, requestMeta(request.headers)),

  // DELETE /api/me/foto
  hapusFoto: ({ user, request }: Konteks) => AuthService.hapusFoto(user.id, requestMeta(request.headers)),

  // GET /api/me/foto/:userId — mengirim gambar WebP (boleh di-cache 1 hari karena URL-nya berversi)
  foto: async ({ params }: Konteks<unknown, { userId: string }>) =>
    new Response(await AuthService.bacaFoto(params.userId), {
      headers: { "Content-Type": "image/webp", "X-Content-Type-Options": "nosniff", "Cache-Control": "private, max-age=86400" },
    }),
};
