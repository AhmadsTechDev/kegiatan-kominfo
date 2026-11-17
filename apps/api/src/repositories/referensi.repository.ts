import { and, asc, eq } from "drizzle-orm";
import { bidang, jenisKegiatan, pegawai } from "@/db/schema";
import { db } from "@/db";

export const ReferensiRepository = {
  semuaBidang() {
    return db.select({ id: bidang.id, parentId: bidang.parentId, kode: bidang.kode, nama: bidang.nama, aktif: bidang.aktif }).from(bidang).orderBy(asc(bidang.id));
  },

  jenisKegiatanAktif() {
    return db.select({ id: jenisKegiatan.id, nama: jenisKegiatan.nama }).from(jenisKegiatan).where(eq(jenisKegiatan.aktif, true)).orderBy(asc(jenisKegiatan.nama));
  },

  pegawaiAktif() {
    return db.select({ id: pegawai.id, nama: pegawai.nama, bidangId: pegawai.bidangId }).from(pegawai).where(eq(pegawai.aktif, true)).orderBy(asc(pegawai.nama));
  },

  async findJenisAktif(id: number) {
    const [j] = await db
      .select({ id: jenisKegiatan.id })
      .from(jenisKegiatan)
      .where(and(eq(jenisKegiatan.id, id), eq(jenisKegiatan.aktif, true)))
      .limit(1);
    return j;
  },

  async findPegawaiAktif(id: number) {
    const [p] = await db
      .select({ id: pegawai.id, bidangId: pegawai.bidangId })
      .from(pegawai)
      .where(and(eq(pegawai.id, id), eq(pegawai.aktif, true)))
      .limit(1);
    return p;
  },
};
