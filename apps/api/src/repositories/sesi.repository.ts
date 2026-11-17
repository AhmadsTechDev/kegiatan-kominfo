import { and, desc, eq, gt, ne } from "drizzle-orm";
import { session } from "@/db/schema";
import { db, type Db } from "@/db";

export const SesiRepository = {
  daftar(userId: string, sekarang = new Date()) {
    return db
      .select({ id: session.id, ipAddress: session.ipAddress, userAgent: session.userAgent, createdAt: session.createdAt, updatedAt: session.updatedAt, expiresAt: session.expiresAt })
      .from(session)
      .where(and(eq(session.userId, userId), gt(session.expiresAt, sekarang)))
      .orderBy(desc(session.updatedAt));
  },

  async hapus(userId: string, id: string) {
    const hasil = await db.delete(session).where(and(eq(session.id, id), eq(session.userId, userId)));
    return (hasil.rowCount ?? 0) > 0;
  },

  async hapusSemua(userId: string, kecualiId?: string, tx: Db = db) {
    const hasil = await tx.delete(session).where(and(eq(session.userId, userId), kecualiId ? ne(session.id, kecualiId) : undefined));
    return hasil.rowCount ?? 0;
  },
};
