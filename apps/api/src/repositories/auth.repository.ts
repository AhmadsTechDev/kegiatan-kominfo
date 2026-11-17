import { and, eq, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { account, bidang, pegawai, user } from "@/db/schema";
import { db, type Db } from "@/db";
import { PROVIDER_KREDENSIAL, punyaKredensial } from "@/utils/status-akun";

const syaratKredensial = (userId: string) => and(eq(account.userId, userId), eq(account.providerId, PROVIDER_KREDENSIAL));

export const AuthRepository = {
  async findByEmail(email: string) {
    const [u] = await db.select().from(user).where(eq(user.email, email.toLowerCase())).limit(1);
    return u;
  },

  async akunKredensial(cari: { id: string } | { email: string }) {
    const [u] = await db
      .select({ id: user.id, name: user.name, email: user.email, emailBaru: user.emailBaru, banned: user.banned, punyaKredensial })
      .from(user)
      .where("id" in cari ? eq(user.id, cari.id) : eq(user.email, cari.email))
      .limit(1);
    return u;
  },

  async hashSandi(userId: string) {
    const [a] = await db.select({ password: account.password }).from(account).where(syaratKredensial(userId)).limit(1);
    return a?.password ?? undefined;
  },

  async buatKredensial(userId: string, hash: string, tx: Db) {
    await tx.insert(account).values({ id: crypto.randomUUID(), accountId: userId, providerId: PROVIDER_KREDENSIAL, userId, password: hash });
  },

  async gantiSandi(userId: string, hash: string, tx: Db = db) {
    const hasil = await tx.update(account).set({ password: hash }).where(syaratKredensial(userId));
    return hasil.rowCount ?? 0;
  },

  async resetLoginGagal(userId: string, tx: Db = db) {
    await tx.update(user).set({ failedLoginCount: 0, lockedUntil: null }).where(eq(user.id, userId));
  },

  async verifikasiDanBuka(userId: string, tx: Db) {
    await tx.update(user).set({ emailVerified: true, failedLoginCount: 0, lockedUntil: null }).where(eq(user.id, userId));
  },

  async terapkanEmailBaru(userId: string, email: string, tx: Db) {
    await tx.update(user).set({ email, emailBaru: null, emailVerified: true }).where(eq(user.id, userId));
  },

  async tambahLoginGagal(userId: string) {
    await db
      .update(user)
      .set({ failedLoginCount: sql`${user.failedLoginCount} + 1` })
      .where(eq(user.id, userId));
  },

  async kunci(userId: string, sampai: Date) {
    await db.update(user).set({ failedLoginCount: 0, lockedUntil: sampai }).where(eq(user.id, userId));
  },

  async fotoKey(userId: string) {
    const [u] = await db.select({ image: user.image }).from(user).where(eq(user.id, userId)).limit(1);
    return u?.image ?? null;
  },

  async setFoto(userId: string, key: string | null) {
    await db.update(user).set({ image: key }).where(eq(user.id, userId));
  },

  async ubahKontak(userId: string, kontak: string | null) {
    await db.update(user).set({ kontak }).where(eq(user.id, userId));
  },

  async setEmailBaru(userId: string, emailBaru: string | null, tx: Db = db) {
    await tx.update(user).set({ emailBaru }).where(eq(user.id, userId));
  },

  async emailDipakai(email: string, kecualiUserId?: string) {
    const [u] = await db
      .select({ id: user.id })
      .from(user)
      .where(and(eq(user.email, email), kecualiUserId ? ne(user.id, kecualiUserId) : undefined))
      .limit(1);
    return u != null;
  },

  async findProfil(userId: string) {
    const induk = alias(bidang, "induk");
    const [baris] = await db
      .select({
        akun: {
          id: user.id,
          name: user.name,
          email: user.email,
          emailBaru: user.emailBaru,
          emailVerified: user.emailVerified,
          role: user.role,
          banned: user.banned,
          image: user.image,
          kontak: user.kontak,
          createdAt: user.createdAt,
        },
        punyaKredensial,
        pegawai: { id: pegawai.id, nip: pegawai.nip, nama: pegawai.nama },
        bidang: { id: bidang.id, kode: bidang.kode, nama: bidang.nama },
        induk: { id: induk.id, nama: induk.nama },
      })
      .from(user)
      .leftJoin(pegawai, eq(user.pegawaiId, pegawai.id))
      .leftJoin(bidang, eq(pegawai.bidangId, bidang.id))
      .leftJoin(induk, eq(bidang.parentId, induk.id))
      .where(eq(user.id, userId))
      .limit(1);
    if (!baris) return undefined;
    return {
      ...baris.akun,
      punyaKredensial: baris.punyaKredensial,
      pegawai: baris.pegawai ? { ...baris.pegawai, bidang: { ...baris.bidang!, parent: baris.induk } } : null,
    };
  },
};
