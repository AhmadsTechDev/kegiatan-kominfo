import { and, eq, exists, not, sql, type SQL } from "drizzle-orm";
import { account, user } from "@/db/schema";
import { db } from "@/lib/db";
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

export const PROVIDER_KREDENSIAL = "credential";

/**
 * Akun "punya kredensial" berarti punya baris di tabel account dengan provider "credential" (email + kata sandi).
 * Setara SQL: EXISTS (SELECT 1 FROM account WHERE account.user_id = user.id AND account.provider_id = 'credential')
 */
const adaKredensial = exists(
  db
    .select({ satu: sql`1` })
    .from(account)
    .where(and(eq(account.userId, user.id), eq(account.providerId, PROVIDER_KREDENSIAL))),
);

/**
 * Kolom hitungan true/false untuk dipakai di dalam select
 */
export const punyaKredensial = sql<boolean>`${adaKredensial}`;

/**
 * Syarat SQL untuk menyaring user berdasarkan status
 */
export function kondisiStatus(status: StatusAkun): SQL {
  if (status === "NONAKTIF") return eq(user.banned, true);
  if (status === "AKTIF") return and(eq(user.banned, false), adaKredensial)!;
  return and(eq(user.banned, false), not(adaKredensial))!;
}
