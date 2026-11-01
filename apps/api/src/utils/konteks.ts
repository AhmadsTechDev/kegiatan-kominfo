import type { Admin, Aktor, MetaRequest, UserSesi } from "@/types/umum.types";

// Mengambil IP asli (melewati proxy) dan user-agent dari header permintaan
export function requestMeta(headers: Headers): MetaRequest {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return {
    ip: forwarded || headers.get("x-real-ip") || null,
    userAgent: headers.get("user-agent"),
  };
}

// Mengubah user sesi menjadi Aktor yang dipakai service
export const aktorDari = (user: UserSesi): Aktor => ({ id: user.id, role: user.role, pegawaiId: user.pegawaiId ?? null });

// Menyiapkan data admin (id, header cookie, meta) untuk service yang memanggil Better Auth
export const adminDari = (user: { id: string }, request: Request): Admin => ({
  id: user.id,
  headers: request.headers,
  meta: requestMeta(request.headers),
});
