import { and, desc, eq, gt } from "drizzle-orm";
import { verification } from "@/db/schema";
import { berawalan, db, type Db } from "@/lib/db";
import { identifierToken, type TujuanToken } from "@/utils/token";

/**
 * Token tautan email disimpan di tabel verification: identifier = "<tujuan>:<sha256 token>", value = id user
 */
export const TokenAkunRepository = {
  /**
   * Menyimpan token baru; token lama dengan tujuan yang sama milik user ini dihapus agar hanya tautan terbaru yang berlaku
   */
  async simpan(tujuan: TujuanToken, userId: string, token: string, kedaluwarsa: Date, tx: Db = db) {
    await tx.delete(verification).where(and(eq(verification.value, userId), berawalan(verification.identifier, `${tujuan}:`)));
    await tx.insert(verification).values({ id: crypto.randomUUID(), identifier: identifierToken(tujuan, token), value: userId, expiresAt: kedaluwarsa });
  },

  /**
   * Membaca token yang masih berlaku tanpa memakainya
   */
  async cari(tujuan: TujuanToken, token: string, sekarang = new Date()) {
    const [v] = await db
      .select({ id: verification.id, value: verification.value, expiresAt: verification.expiresAt })
      .from(verification)
      .where(and(eq(verification.identifier, identifierToken(tujuan, token)), gt(verification.expiresAt, sekarang)))
      .limit(1);
    return v;
  },

  /**
   * Memakai token sekali: baris dihapus, dan hanya satu pemanggil yang berhasil bila ada permintaan bersamaan.
   * Mengembalikan id user pemilik token, atau undefined bila token salah/kedaluwarsa/sudah dipakai
   */
  async pakai(tujuan: TujuanToken, token: string, tx: Db, sekarang = new Date()) {
    const [baris] = await tx
      .select({ id: verification.id, value: verification.value })
      .from(verification)
      .where(and(eq(verification.identifier, identifierToken(tujuan, token)), gt(verification.expiresAt, sekarang)))
      .limit(1);
    if (!baris) return undefined;

    /**
     * Penghapusan dipakai sebagai "kunci": bila dua permintaan memakai token yang sama bersamaan, database hanya
     * menghapus barisnya sekali. Yang mendapat rowCount = 1 adalah pemenangnya; yang lain mendapat 0 dan ditolak.
     */
    const hasil = await tx.delete(verification).where(eq(verification.id, baris.id));
    return hasil.rowCount === 1 ? baris.value : undefined;
  },

  /**
   * Menghapus semua token milik user (semua tujuan, atau satu tujuan saja)
   */
  async hapusMilik(userId: string, tujuan?: TujuanToken, tx: Db = db) {
    await tx.delete(verification).where(and(eq(verification.value, userId), tujuan ? berawalan(verification.identifier, `${tujuan}:`) : undefined));
  },

  /**
   * Waktu kedaluwarsa token aktivasi yang masih berlaku (untuk halaman detail akun)
   */
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
