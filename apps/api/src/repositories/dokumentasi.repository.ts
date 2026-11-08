import { and, asc, eq, inArray } from "drizzle-orm";
import { dokumentasi, kegiatan } from "@/db/schema";
import { db, type Db } from "@/lib/db";
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
  /**
   * Berkas dokumentasi banyak kegiatan sekaligus (untuk laporan), urut waktu unggah
   */
  untukKegiatan(kegiatanIds: number[]) {
    return db
      .select({
        id: dokumentasi.id,
        kegiatanId: dokumentasi.kegiatanId,
        path: dokumentasi.path,
        namaAsli: dokumentasi.namaAsli,
        mime: dokumentasi.mime,
        ukuran: dokumentasi.ukuran,
        createdAt: dokumentasi.createdAt,
      })
      .from(dokumentasi)
      .where(inArray(dokumentasi.kegiatanId, kegiatanIds))
      .orderBy(asc(dokumentasi.id));
  },

  /**
   * Satu dokumentasi beserta data kegiatannya (untuk cek hak akses); undefined bila kegiatan sudah dihapus
   */
  async findDenganKegiatan(id: number) {
    const [baris] = await db
      .select({
        dokumentasi,
        kegiatan: { id: kegiatan.id, bidangId: kegiatan.bidangId, dibuatOleh: kegiatan.dibuatOleh, penanggungJawabId: kegiatan.penanggungJawabId },
      })
      .from(dokumentasi)
      .innerJoin(kegiatan, eq(dokumentasi.kegiatanId, kegiatan.id))
      .where(and(eq(dokumentasi.id, id), KEGIATAN_AKTIF))
      .limit(1);
    return baris;
  },

  /**
   * Jumlah berkas dokumentasi sebuah kegiatan
   */
  hitung(kegiatanId: number, tx: Db = db) {
    return tx.$count(dokumentasi, eq(dokumentasi.kegiatanId, kegiatanId));
  },

  /**
   * Menyimpan metadata berkas baru dan mengembalikan barisnya
   */
  async insert(nilai: NilaiDokumentasi, tx: Db) {
    const [baris] = await tx.insert(dokumentasi).values(nilai).returning();
    return baris!;
  },

  /**
   * Mengganti metadata berkas (berkas lama diganti); undefined bila dokumentasi tidak ada
   */
  async ganti(id: number, nilai: Omit<NilaiDokumentasi, "kegiatanId"> & { createdAt: Date }, tx: Db) {
    const [baris] = await tx.update(dokumentasi).set(nilai).where(eq(dokumentasi.id, id)).returning();
    return baris;
  },

  /**
   * Menghapus metadata berkas
   */
  async hapus(id: number, tx: Db) {
    await tx.delete(dokumentasi).where(eq(dokumentasi.id, id));
  },
};
