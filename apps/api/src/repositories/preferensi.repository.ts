import { eq } from "drizzle-orm";
import { preferensiPengguna } from "@/db/schema";
import { db } from "@/lib/db";
import type { Preferensi } from "@/types/auth.types";

const PILIH = {
  tema: preferensiPengguna.tema,
  notifPengingatKegiatan: preferensiPengguna.notifPengingatKegiatan,
  notifPengingatDokumentasi: preferensiPengguna.notifPengingatDokumentasi,
};

export const PreferensiRepository = {
  /**
   * Preferensi user; undefined bila belum pernah diubah (pakai nilai bawaan)
   */
  async ambil(userId: string) {
    const [p] = await db.select(PILIH).from(preferensiPengguna).where(eq(preferensiPengguna.userId, userId)).limit(1);
    return p;
  },

  /**
   * Menyimpan sebagian preferensi (baris dibuat bila belum ada)
   * Setara SQL: INSERT ... ON CONFLICT (user_id) DO UPDATE SET ...
   */
  async simpan(userId: string, isi: Partial<Preferensi>) {
    const [p] = await db
      .insert(preferensiPengguna)
      .values({ userId, ...isi })
      .onConflictDoUpdate({ target: preferensiPengguna.userId, set: { ...isi, updatedAt: new Date() } })
      .returning(PILIH);
    return p!;
  },
};
