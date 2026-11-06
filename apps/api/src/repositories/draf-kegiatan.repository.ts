import { prisma, type Db } from "@/lib/prisma";
import type { IsiDraf } from "@/types/draf-kegiatan.types";

const PILIH_DRAF = { id: true, isi: true, updatedAt: true } as const;

export const DrafKegiatanRepository = {
  /**
   * Daftar draf milik user, yang terakhir diubah di atas
   */
  daftar(pemilikId: string) {
    return prisma.drafKegiatan.findMany({ where: { pemilikId }, select: PILIH_DRAF, orderBy: [{ updatedAt: "desc" }, { id: "desc" }] });
  },

  /**
   * Jumlah draf milik user (untuk batas maksimal draf)
   */
  jumlah(pemilikId: string) {
    return prisma.drafKegiatan.count({ where: { pemilikId } });
  },

  /**
   * Satu draf milik user; undefined bila tidak ada atau milik orang lain
   */
  async detail(id: number, pemilikId: string) {
    return (await prisma.drafKegiatan.findFirst({ where: { id, pemilikId }, select: PILIH_DRAF })) ?? undefined;
  },

  /**
   * Menyimpan draf baru dan mengembalikan id-nya
   */
  async insert(pemilikId: string, isi: IsiDraf) {
    const baru = await prisma.drafKegiatan.create({ data: { pemilikId, isi }, select: { id: true } });
    return baru.id;
  },

  /**
   * Mengganti isi draf milik user; mengembalikan jumlah baris yang berubah (0 = tidak ditemukan)
   */
  async update(id: number, pemilikId: string, isi: IsiDraf) {
    const hasil = await prisma.drafKegiatan.updateMany({ where: { id, pemilikId }, data: { isi } });
    return hasil.count;
  },

  /**
   * Menghapus draf milik user; mengembalikan jumlah baris yang terhapus
   */
  async hapus(id: number, pemilikId: string, db: Db = prisma) {
    const hasil = await db.drafKegiatan.deleteMany({ where: { id, pemilikId } });
    return hasil.count;
  },
};
