import { eq } from "drizzle-orm";
import { preferensiPengguna } from "@/db/schema";
import { db } from "@/db";
import type { Preferensi } from "@/validators/auth.validator";

const PILIH = {
  tema: preferensiPengguna.tema,
  notifPengingatKegiatan: preferensiPengguna.notifPengingatKegiatan,
  notifPengingatDokumentasi: preferensiPengguna.notifPengingatDokumentasi,
};

export const PreferensiRepository = {
  async ambil(userId: string) {
    const [p] = await db.select(PILIH).from(preferensiPengguna).where(eq(preferensiPengguna.userId, userId)).limit(1);
    return p;
  },

  async simpan(userId: string, isi: Partial<Preferensi>) {
    const [p] = await db
      .insert(preferensiPengguna)
      .values({ userId, ...isi })
      .onConflictDoUpdate({ target: preferensiPengguna.userId, set: { ...isi, updatedAt: new Date() } })
      .returning(PILIH);
    return p!;
  },
};
