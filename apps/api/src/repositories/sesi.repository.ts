import { prisma, type Db } from "@/lib/prisma";

/**
 * Sesi login (tabel session milik Better Auth). Kolom token tidak pernah dibaca keluar dari sini.
 */
export const SesiRepository = {
  /**
   * Sesi yang masih berlaku milik seorang user, terbaru dipakai di atas
   */
  daftar(userId: string, sekarang = new Date()) {
    return prisma.session.findMany({
      where: { userId, expiresAt: { gt: sekarang } },
      select: { id: true, ipAddress: true, userAgent: true, createdAt: true, updatedAt: true, expiresAt: true },
      orderBy: { updatedAt: "desc" },
    });
  },

  /**
   * Mencabut satu sesi milik user; mengembalikan true bila ada yang dicabut
   */
  async hapus(userId: string, id: string) {
    const { count } = await prisma.session.deleteMany({ where: { id, userId } });
    return count > 0;
  },

  /**
   * Mencabut semua sesi user, kecuali satu sesi (mis. sesi yang sedang dipakai); mengembalikan jumlahnya
   */
  async hapusSemua(userId: string, kecualiId?: string, db: Db = prisma) {
    const { count } = await db.session.deleteMany({ where: { userId, id: kecualiId ? { not: kecualiId } : undefined } });
    return count;
  },
};
