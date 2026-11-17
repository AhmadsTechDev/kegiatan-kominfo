import { and, desc, eq, gt } from "drizzle-orm";
import { verification } from "@/db/schema";
import { berawalan, db, type Db } from "@/db";
import { identifierToken, type TujuanToken } from "@/utils/token";

export const TokenAkunRepository = {
  async simpan(tujuan: TujuanToken, userId: string, token: string, kedaluwarsa: Date, tx: Db = db) {
    await tx.delete(verification).where(and(eq(verification.value, userId), berawalan(verification.identifier, `${tujuan}:`)));
    await tx.insert(verification).values({ id: crypto.randomUUID(), identifier: identifierToken(tujuan, token), value: userId, expiresAt: kedaluwarsa });
  },

  async cari(tujuan: TujuanToken, token: string, sekarang = new Date()) {
    const [v] = await db
      .select({ id: verification.id, value: verification.value, expiresAt: verification.expiresAt })
      .from(verification)
      .where(and(eq(verification.identifier, identifierToken(tujuan, token)), gt(verification.expiresAt, sekarang)))
      .limit(1);
    return v;
  },

  async pakai(tujuan: TujuanToken, token: string, tx: Db, sekarang = new Date()) {
    const [baris] = await tx
      .select({ id: verification.id, value: verification.value })
      .from(verification)
      .where(and(eq(verification.identifier, identifierToken(tujuan, token)), gt(verification.expiresAt, sekarang)))
      .limit(1);
    if (!baris) return undefined;

    const hasil = await tx.delete(verification).where(eq(verification.id, baris.id));
    return hasil.rowCount === 1 ? baris.value : undefined;
  },

  async hapusMilik(userId: string, tujuan?: TujuanToken, tx: Db = db) {
    await tx.delete(verification).where(and(eq(verification.value, userId), tujuan ? berawalan(verification.identifier, `${tujuan}:`) : undefined));
  },

  async kedaluwarsaAktivasi(userId: string, sekarang = new Date()) {
    const [v] = await db
      .select({ expiresAt: verification.expiresAt })
      .from(verification)
      .where(and(eq(verification.value, userId), berawalan(verification.identifier, "aktivasi:"), gt(verification.expiresAt, sekarang)))
      .orderBy(desc(verification.expiresAt))
      .limit(1);
    return v?.expiresAt ?? null;
  },
};
