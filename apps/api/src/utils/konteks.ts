import type { Admin, Aktor, MetaRequest, UserSesi } from "@/types/umum.types";

/**
 * Mengambil IP asli (melewati proxy) dan user-agent dari header permintaan
 *
 * x-forwarded-for bisa berisi beberapa IP ("klien, proxy1, proxy2"); yang paling kiri adalah IP klien asli.
 * `a || b || null` artinya: pakai a bila ada, kalau kosong pakai b, kalau masih kosong null.
 */
export function requestMeta(headers: Headers): MetaRequest {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return {
    ip: forwarded || headers.get("x-real-ip") || null,
    userAgent: headers.get("user-agent"),
  };
}

/**
 * Mengubah user sesi menjadi Aktor yang dipakai service
 *
 * Service tidak menerima seluruh data user, hanya Aktor (id, role, pegawaiId) yang cukup untuk cek hak akses.
 * Dengan begitu service tidak bergantung pada bentuk data sesi Better Auth.
 */
export const aktorDari = (user: UserSesi): Aktor => ({ id: user.id, role: user.role, pegawaiId: user.pegawaiId ?? null });

/**
 * Menyiapkan data admin (id, header, meta, sesi aktif) untuk service manajemen akun
 */
export const adminDari = (user: { id: string }, request: Request, session?: { id: string }): Admin => ({
  id: user.id,
  headers: request.headers,
  meta: requestMeta(request.headers),
  sesiId: session?.id,
});

const METODE_AMAN = ["GET", "HEAD", "OPTIONS"];

/**
 * Perlindungan CSRF: permintaan yang mengubah data hanya diterima bila Origin (atau Referer) berasal dari origin terpercaya.
 * Cookie SameSite=Lax sudah menahan sebagian besar serangan lintas situs; ini menutup sisanya (mis. subdomain lain)
 */
export function asalTerpercaya(request: Request, terpercaya: string[]) {
  /**
   * GET/HEAD/OPTIONS hanya membaca data, jadi tidak perlu dicek. Bila header Origin tidak ada, dipakai Referer sebagai cadangan.
   */
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
