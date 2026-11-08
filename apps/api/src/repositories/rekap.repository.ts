import { eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { bidang, jenisKegiatan, kegiatan, pegawai } from "@/db/schema";
import { db } from "@/lib/db";
import type { FilterDaftar } from "@/types/kegiatan.types";
import { kondisiDaftar } from "./kegiatan.repository";

export const RekapRepository = {
  /**
   * Semua kegiatan sesuai filter dengan kolom yang dibutuhkan rekap; penjumlahan dilakukan di service
   */
  async barisRekap(f: FilterDaftar, sekarang: Date) {
    const bidangPegawai = alias(bidang, "bidang_pegawai");
    const baris = await db
      .select({
        bidangId: kegiatan.bidangId,
        tglMulai: kegiatan.tglMulai,
        tglSelesai: kegiatan.tglSelesai,
        dibatalkanAt: kegiatan.dibatalkanAt,
        jumlahPeserta: kegiatan.jumlahPeserta,
        jenis: { id: jenisKegiatan.id, nama: jenisKegiatan.nama },
        pegawai: { id: pegawai.id, nama: pegawai.nama },
        bidangPegawai: bidangPegawai.nama,
      })
      .from(kegiatan)
      .innerJoin(jenisKegiatan, eq(kegiatan.jenisId, jenisKegiatan.id))
      .innerJoin(pegawai, eq(kegiatan.penanggungJawabId, pegawai.id))
      .innerJoin(bidangPegawai, eq(pegawai.bidangId, bidangPegawai.id))
      .where(kondisiDaftar(f, sekarang));
    return baris.map(({ pegawai: pj, bidangPegawai: namaBidang, ...k }) => ({ ...k, penanggungJawab: { ...pj, bidang: { nama: namaBidang } } }));
  },
};
