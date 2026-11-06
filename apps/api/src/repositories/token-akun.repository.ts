import { prisma, type Db } from "@/lib/prisma";
import { identifierToken, type TujuanToken } from "@/utils/token";

/**
 * Token tautan email disimpan di tabel verification: identifier = "<tujuan>:<sha256 token>", value = id user
 */
export const TokenAkunRepository = {
  /**
   * Menyimpan token baru; token lama dengan tujuan yang sama milik user ini dihapus agar hanya tautan terbaru yang berlaku
   */
  async simpan(tujuan: TujuanToken, userId: string, token: string, kedaluwarsa: Date, db: Db = prisma) {
    await db.verification.deleteMany({ where: { value: userId, identifier: { startsWith: `${tujuan}:` } } });
    await db.verification.create({ data: { id: crypto.randomUUID(), identifier: identifierToken(tujuan, token), value: userId, expiresAt: kedaluwarsa } });
  },

  /**
   * Membaca token yang masih berlaku tanpa memakainya
   */
  async cari(tujuan: TujuanToken, token: string, sekarang = new Date()) {
    return (
      (await prisma.verification.findFirst({
        where: { identifier: identifierToken(tujuan, token), expiresAt: { gt: sekarang } },
        select: { id: true, value: true, expiresAt: true },
      })) ?? undefined
    );
  },

  /**
   * Memakai token sekali: baris dihapus, dan hanya satu pemanggil yang berhasil bila ada permintaan bersamaan.
   * Mengembalikan id user pemilik token, atau undefined bila token salah/kedaluwarsa/sudah dipakai
   */
  async pakai(tujuan: TujuanToken, token: string, db: Db, sekarang = new Date()) {
    const baris = await db.verification.findFirst({
      where: { identifier: identifierToken(tujuan, token), expiresAt: { gt: sekarang } },
      select: { id: true, value: true },
    });
    if (!baris) return undefined;

    /**
     * Penghapusan dipakai sebagai "kunci": bila dua permintaan memakai token yang sama bersamaan, database hanya
     * menghapus barisnya sekali. Yang mendapat count = 1 adalah pemenangnya; yang lain mendapat 0 dan ditolak.
     */
    const { count } = await db.verification.deleteMany({ where: { id: baris.id } });
    return count === 1 ? baris.value : undefined;
  },

  /**
   * Menghapus semua token milik user (semua tujuan, atau satu tujuan saja)
   */
  async hapusMilik(userId: string, tujuan?: TujuanToken, db: Db = prisma) {
    await db.verification.deleteMany({ where: { value: userId, identifier: tujuan ? { startsWith: `${tujuan}:` } : undefined } });
  },

  /**
   * Waktu kedaluwarsa token aktivasi yang masih berlaku (untuk halaman detail akun)
   */
  async kedaluwarsaAktivasi(userId: string, sekarang = new Date()) {
    const v = await prisma.verification.findFirst({
      where: { value: userId, identifier: { startsWith: "aktivasi:" }, expiresAt: { gt: sekarang } },
      select: { expiresAt: true },
      orderBy: { expiresAt: "desc" },
    });
    return v?.expiresAt ?? null;
  },
};
