import type { Admin, Aktor, MetaRequest, UserSesi } from "@/types/umum.types";

const METODE_AMAN = ["GET", "HEAD", "OPTIONS"];

export function requestMeta(headers: Headers): MetaRequest {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return {
    ip: forwarded || headers.get("x-real-ip") || null,
  };
}

export const aktorDari = (user: UserSesi): Aktor => ({ id: user.id, role: user.role, pegawaiId: user.pegawaiId ?? null });

export const adminDari = (user: { id: string }, session?: { id: string }): Admin => ({
  id: user.id,
  sesiId: session?.id,
});

export function asalTerpercaya(request: Request, terpercaya: string[]) {
  if (METODE_AMAN.includes(request.method)) return true;
  let asal = request.headers.get("origin");
  if (!asal) {
    try {
      asal = new URL(request.headers.get("referer") ?? "").origin;
    } catch {
      return false;
    }
  }
  return terpercaya.includes(asal);
}
