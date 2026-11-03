import { prisma, type Db } from "@/lib/prisma";

const BATAS_DAFTAR = 20;

export const NotifikasiRepository = {
  // Notifikasi terbaru milik user beserta jumlah yang belum dibaca
  async daftar(userId: string) {
    const [items, belumDibaca] = await Promise.all([
      prisma.notifikasi.findMany({
        where: { userId },
        select: { id: true, jenis: true, judul: true, isi: true, kegiatanId: true, dibacaAt: true, createdAt: true },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: BATAS_DAFTAR,
      }),
      prisma.notifikasi.count({ where: { userId, dibacaAt: null } }),
    ]);
    return { items, belumDibaca };
  },

  // Pegawai yang terkait kegiatan: pembuatnya dan akun penanggung jawabnya (kecuali aktor sendiri)
  penerimaKegiatan(k: { dibuatOleh: string; penanggungJawabId: number }, kecuali: string, tx: Db) {
    return tx.user.findMany({
      where: { role: "PEGAWAI", banned: false, id: { not: kecuali }, OR: [{ id: k.dibuatOleh }, { pegawaiId: k.penanggungJawabId }] },
      select: { id: true },
    });
  },

  async buatBanyak(data: { userId: string; jenis: string; judul: string; isi: string | null; kegiatanId: number }[], tx: Db) {
    if (data.length) await tx.notifikasi.createMany({ data });
  },

  // Menandai dibaca; hanya milik user sendiri. Mengembalikan jumlah baris yang berubah
  async tandaiDibaca(userId: string, id?: number) {
    const hasil = await prisma.notifikasi.updateMany({ where: { userId, dibacaAt: null, ...(id ? { id } : {}) }, data: { dibacaAt: new Date() } });
    return hasil.count;
  },
};
