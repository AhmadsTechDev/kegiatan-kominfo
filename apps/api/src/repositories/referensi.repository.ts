import { and, asc, eq } from "drizzle-orm";
import { bidang, jenisKegiatan, pegawai } from "@/db/schema";
import { db } from "@/lib/db";

export const ReferensiRepository = {
  /**
   * Semua bidang (aktif maupun tidak), urut id
   */
  semuaBidang() {
    return db.select({ id: bidang.id, parentId: bidang.parentId, kode: bidang.kode, nama: bidang.nama, aktif: bidang.aktif }).from(bidang).orderBy(asc(bidang.id));
  },

  /**
   * Jenis kegiatan yang masih aktif, urut nama
   */
  jenisKegiatanAktif() {
    return db.select({ id: jenisKegiatan.id, nama: jenisKegiatan.nama }).from(jenisKegiatan).where(eq(jenisKegiatan.aktif, true)).orderBy(asc(jenisKegiatan.nama));
  },

  /**
   * Pegawai aktif tanpa NIP (NIP tidak dibagikan ke semua role demi privasi)
   */
  pegawaiAktif() {
    return db.select({ id: pegawai.id, nama: pegawai.nama, bidangId: pegawai.bidangId }).from(pegawai).where(eq(pegawai.aktif, true)).orderBy(asc(pegawai.nama));
  },

  /**
   * Jenis kegiatan aktif berdasarkan id; undefined bila tidak ada/nonaktif
   */
  async findJenisAktif(id: number) {
    const [j] = await db
      .select({ id: jenisKegiatan.id })
      .from(jenisKegiatan)
      .where(and(eq(jenisKegiatan.id, id), eq(jenisKegiatan.aktif, true)))
      .limit(1);
    return j;
  },

  /**
   * Pegawai aktif berdasarkan id beserta bidangnya; undefined bila tidak ada/nonaktif
   */
  async findPegawaiAktif(id: number) {
    const [p] = await db
      .select({ id: pegawai.id, bidangId: pegawai.bidangId })
      .from(pegawai)
      .where(and(eq(pegawai.id, id), eq(pegawai.aktif, true)))
      .limit(1);
    return p;
  },
};
