import { prisma, type Db } from "@/lib/prisma";
import { KEGIATAN_AKTIF } from "./kegiatan.repository";

type NilaiDokumentasi = {
  kegiatanId: number;
  path: string;
  namaAsli: string;
  mime: string;
  ukuran: number;
  sha256: string;
  diunggahOleh: string;
};

export const DokumentasiRepository = {
  // Berkas dokumentasi banyak kegiatan sekaligus (untuk laporan), urut waktu unggah
  untukKegiatan(kegiatanIds: number[]) {
    return prisma.dokumentasi.findMany({
      where: { kegiatanId: { in: kegiatanIds } },
      select: { id: true, kegiatanId: true, path: true, namaAsli: true, mime: true, ukuran: true, createdAt: true },
      orderBy: { id: "asc" },
    });
  },

  // Satu dokumentasi beserta data kegiatannya (untuk cek hak akses); undefined bila kegiatan sudah dihapus
  async findDenganKegiatan(id: number) {
    const baris = await prisma.dokumentasi.findFirst({
      where: { id, kegiatan: KEGIATAN_AKTIF },
      include: { kegiatan: { select: { id: true, bidangId: true, dibuatOleh: true, penanggungJawabId: true } } },
    });
    if (!baris) return undefined;
    const { kegiatan, ...dokumentasi } = baris;
    return { dokumentasi, kegiatan };
  },

  // Jumlah berkas dokumentasi sebuah kegiatan
  hitung(kegiatanId: number, db: Db = prisma) {
    return db.dokumentasi.count({ where: { kegiatanId } });
  },

  // Menyimpan metadata berkas baru dan mengembalikan barisnya
  insert(nilai: NilaiDokumentasi, tx: Db) {
    return tx.dokumentasi.create({ data: nilai });
  },

  // Mengganti metadata berkas (berkas lama diganti); undefined bila dokumentasi tidak ada
  async ganti(id: number, nilai: Omit<NilaiDokumentasi, "kegiatanId"> & { createdAt: Date }, tx: Db) {
    const hasil = await tx.dokumentasi.updateMany({ where: { id }, data: nilai });
    if (hasil.count === 0) return undefined;
    return (await tx.dokumentasi.findUnique({ where: { id } })) ?? undefined;
  },

  // Menghapus metadata berkas
  async hapus(id: number, tx: Db) {
    await tx.dokumentasi.deleteMany({ where: { id } });
  },
};
