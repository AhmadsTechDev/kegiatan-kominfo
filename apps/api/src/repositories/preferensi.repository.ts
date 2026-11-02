import { prisma } from "@/lib/prisma";
import type { Preferensi } from "@/types/auth.types";

const PILIH = { tema: true, notifPengingatKegiatan: true, notifPengingatDokumentasi: true } as const;

export const PreferensiRepository = {
  // Preferensi user; undefined bila belum pernah diubah (pakai nilai bawaan)
  async ambil(userId: string) {
    return (await prisma.preferensiPengguna.findUnique({ where: { userId }, select: PILIH })) ?? undefined;
  },

  // Menyimpan sebagian preferensi (baris dibuat bila belum ada)
  simpan(userId: string, isi: Partial<Preferensi>) {
    return prisma.preferensiPengguna.upsert({ where: { userId }, create: { userId, ...isi }, update: isi, select: PILIH });
  },
};
