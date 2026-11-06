import type { Prisma } from "@/lib/prisma";
import type { StatusAkun } from "@/types/umum.types";

/**
 * Status akun tidak disimpan sebagai kolom agar tidak bisa tidak sinkron dengan datanya:
 *   NONAKTIF           = dinonaktifkan admin (banned)
 *   MENUNGGU_AKTIVASI  = dibuat admin tetapi pemiliknya belum membuat kata sandi (belum punya kredensial)
 *   AKTIF              = sudah punya kata sandi dan tidak dinonaktifkan
 */
export function statusAkun(a: { banned: boolean; punyaKredensial: boolean }): StatusAkun {
  if (a.banned) return "NONAKTIF";
  return a.punyaKredensial ? "AKTIF" : "MENUNGGU_AKTIVASI";
}

/**
 * Akun "punya kredensial" berarti punya baris di tabel account dengan provider "credential" (email + kata sandi).
 */
const KREDENSIAL = { providerId: "credential" } satisfies Prisma.AccountWhereInput;

/**
 * Syarat Prisma untuk menyaring user berdasarkan status
 */
export function kondisiStatus(status: StatusAkun): Prisma.UserWhereInput {
  if (status === "NONAKTIF") return { banned: true };

  /**
   * `some` = punya minimal satu baris relasi yang cocok, `none` = tidak punya sama sekali.
   */
  if (status === "AKTIF") return { banned: false, accounts: { some: KREDENSIAL } };
  return { banned: false, accounts: { none: KREDENSIAL } };
}
