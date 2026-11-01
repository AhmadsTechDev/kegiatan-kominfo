import { prisma, type Prisma } from "@/lib/prisma";
import type { JenisPengingat } from "@/generated/prisma/enums";

const BATAS_PER_PUTARAN = 200;

export type KandidatPengingat = {
  kegiatanId: number;
  judul: string;
  tglMulai: Date;
  tglSelesai: Date;
  lokasiNama: string | null;
  userId: string;
  email: string;
  nama: string;
};

// Kegiatan yang perlu diingatkan + akun penanggung jawabnya, kecuali yang sudah pernah dikirimi pengingat jenis ini
async function kandidat(jenis: JenisPengingat, syarat: Prisma.KegiatanWhereInput): Promise<KandidatPengingat[]> {
  const kegiatan = await prisma.kegiatan.findMany({
    where: { deletedAt: null, dibatalkanAt: null, ...syarat, penanggungJawab: { users: { some: { banned: false } } } },
    select: {
      id: true,
      judul: true,
      tglMulai: true,
      tglSelesai: true,
      lokasiNama: true,
      penanggungJawab: { select: { users: { where: { banned: false }, select: { id: true, email: true, name: true } } } },
      pengingat: { where: { jenis }, select: { userId: true } },
    },
    take: BATAS_PER_PUTARAN,
  });
  return kegiatan.flatMap((k) => {
    const sudah = new Set(k.pengingat.map((p) => p.userId));
    return k.penanggungJawab.users
      .filter((u) => !sudah.has(u.id))
      .map((u) => ({
        kegiatanId: k.id,
        judul: k.judul,
        tglMulai: k.tglMulai,
        tglSelesai: k.tglSelesai,
        lokasiNama: k.lokasiNama,
        userId: u.id,
        email: u.email,
        nama: u.name,
      }));
  });
}

export const PengingatRepository = {
  // Kegiatan yang mulai dalam 24 jam ke depan
  hMinus1(sekarang: Date) {
    return kandidat("H_MINUS_1", { tglMulai: { gt: sekarang, lte: new Date(sekarang.getTime() + 24 * 3600_000) } });
  },

  // Kegiatan yang selesai (antara `batasMs` lalu sampai `jedaMs` lalu) tetapi belum berdokumentasi
  tanpaDokumentasi(sekarang: Date, jedaMs: number, batasMs: number) {
    return kandidat("DOKUMENTASI", {
      tglSelesai: { lt: new Date(sekarang.getTime() - jedaMs), gte: new Date(sekarang.getTime() - batasMs) },
      dokumentasi: { none: {} },
    });
  },

  // Mencatat bahwa pengingat sudah dikirim (abaikan bila sudah tercatat)
  async catat(kegiatanId: number, jenis: JenisPengingat, userId: string) {
    await prisma.pengingat.createMany({ data: [{ kegiatanId, jenis, userId }], skipDuplicates: true });
  },
};
