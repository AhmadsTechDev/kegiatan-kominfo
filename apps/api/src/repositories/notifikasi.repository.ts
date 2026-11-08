import { and, desc, eq, isNull, ne, or } from "drizzle-orm";
import { notifikasi, user } from "@/db/schema";
import { db, type Db } from "@/lib/db";

const BATAS_DAFTAR = 20;

export const NotifikasiRepository = {
  /**
   * Notifikasi terbaru milik user beserta jumlah yang belum dibaca
   */
  async daftar(userId: string) {
    const [items, belumDibaca] = await Promise.all([
      db
        .select({
          id: notifikasi.id,
          jenis: notifikasi.jenis,
          judul: notifikasi.judul,
          isi: notifikasi.isi,
          kegiatanId: notifikasi.kegiatanId,
          dibacaAt: notifikasi.dibacaAt,
          createdAt: notifikasi.createdAt,
        })
        .from(notifikasi)
        .where(eq(notifikasi.userId, userId))
        .orderBy(desc(notifikasi.createdAt), desc(notifikasi.id))
        .limit(BATAS_DAFTAR),
      db.$count(notifikasi, and(eq(notifikasi.userId, userId), isNull(notifikasi.dibacaAt))),
    ]);
    return { items, belumDibaca };
  },

  /**
   * Pegawai yang terkait kegiatan: pembuatnya dan akun penanggung jawabnya (kecuali aktor sendiri)
   */
  penerimaKegiatan(k: { dibuatOleh: string; penanggungJawabId: number }, kecuali: string, tx: Db) {
    return tx
      .select({ id: user.id })
      .from(user)
      .where(and(eq(user.role, "PEGAWAI"), eq(user.banned, false), ne(user.id, kecuali), or(eq(user.id, k.dibuatOleh), eq(user.pegawaiId, k.penanggungJawabId))));
  },

  async buatBanyak(data: { userId: string; jenis: string; judul: string; isi: string | null; kegiatanId: number }[], tx: Db) {
    if (data.length) await tx.insert(notifikasi).values(data);
  },

  /**
   * Menandai dibaca; hanya milik user sendiri. Mengembalikan jumlah baris yang berubah
   */
  async tandaiDibaca(userId: string, id?: number) {
    const hasil = await db
      .update(notifikasi)
      .set({ dibacaAt: new Date() })
      .where(and(eq(notifikasi.userId, userId), isNull(notifikasi.dibacaAt), id ? eq(notifikasi.id, id) : undefined));
    return hasil.rowCount ?? 0;
  },
};
