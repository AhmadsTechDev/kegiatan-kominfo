import { and, asc, desc, eq, gt, gte, inArray, isNotNull, isNull, lt, lte, or, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { bidang, catatanPemeriksaan, dokumentasi, jenisKegiatan, kegiatan, pegawai, user } from "@/db/schema";
import { db, mengandung, type Db } from "@/lib/db";
import type { FilterDaftar, LingkupBaca, NilaiKegiatan } from "@/types/kegiatan.types";
import type { Halaman, Milik, Rentang, StatusPelaksanaan } from "@/types/umum.types";
import { angka, hitungStatus } from "@/utils/status-kegiatan";

/**
 * Kegiatan yang belum dihapus (soft delete)
 * KONSEP repository: satu-satunya lapisan yang berbicara dengan database. Service tidak menulis query sendiri,
 * cukup memanggil fungsi di sini, jadi bila struktur tabel berubah, yang diubah hanya file repository.
 *
 * Cara membaca query Drizzle di file ini (urutannya sama seperti SQL):
 * - select({...})      = kolom yang diambil; objek bersarang membuat hasilnya bersarang juga.
 * - from(tabel)        = tabel utama; innerJoin/leftJoin = tabel lain yang digabung.
 * - where(syarat)      = syarat baris; and(...) dan or(...) menggabungkan beberapa syarat.
 * - orderBy, limit, offset = urutan hasil, jumlah maksimal baris, dan jumlah baris yang dilewati.
 */
export const KEGIATAN_AKTIF = isNull(kegiatan.deletedAt);

/**
 * Kondisi kegiatan milik user: dibuat olehnya, atau dia penanggung jawabnya
 */
export function kondisiMilik({ userId, pegawaiId }: Milik): SQL {
  return pegawaiId == null ? eq(kegiatan.dibuatOleh, userId) : or(eq(kegiatan.dibuatOleh, userId), eq(kegiatan.penanggungJawabId, pegawaiId))!;
}

/**
 * Kondisi kegiatan yang boleh dilihat PEGAWAI: bidangnya, atau kegiatan miliknya
 */
export function kondisiLingkup({ unitIds, milik }: LingkupBaca): SQL {
  return unitIds.length > 0 ? or(inArray(kegiatan.bidangId, unitIds), kondisiMilik(milik))! : kondisiMilik(milik);
}

/**
 * Kondisi status pelaksanaan (dihitung dari waktu sekarang, tidak disimpan di tabel)
 */
export function kondisiStatus(status: StatusPelaksanaan, sekarang: Date): SQL {
  switch (status) {
    case "dibatalkan":
      return isNotNull(kegiatan.dibatalkanAt);
    case "akan_datang":
      return and(isNull(kegiatan.dibatalkanAt), gt(kegiatan.tglMulai, sekarang))!;
    case "berlangsung":
      return and(isNull(kegiatan.dibatalkanAt), lte(kegiatan.tglMulai, sekarang), gte(kegiatan.tglSelesai, sekarang))!;
    case "selesai":
      return and(isNull(kegiatan.dibatalkanAt), lt(kegiatan.tglSelesai, sekarang))!;
  }
}

/**
 * Kondisi kegiatan yang mulai di dalam rentang waktu
 */
export const kondisiRentang = ({ mulai, akhir }: Rentang) => and(gte(kegiatan.tglMulai, mulai), lt(kegiatan.tglMulai, akhir))!;

/**
 * Menyusun WHERE dari filter daftar kegiatan (dipakai juga oleh rekap, pantau, ekspor)
 *
 * Setiap filter yang diisi menambah satu syarat ke array, lalu semuanya digabung dengan AND
 * (kegiatan harus memenuhi semua syarat). Filter yang kosong tidak menambah syarat apa pun.
 * @param f filter yang sudah disiapkan service (bidang, jenis, status, rentang, kata kunci, lingkup)
 * @param sekarang waktu acuan untuk filter status pelaksanaan
 * @returns syarat SQL
 */
export function kondisiDaftar(f: FilterDaftar, sekarang: Date): SQL {
  const syarat: (SQL | undefined)[] = [KEGIATAN_AKTIF];
  if (f.unitIds) syarat.push(inArray(kegiatan.bidangId, f.unitIds));
  if (f.jenisId) syarat.push(eq(kegiatan.jenisId, f.jenisId));
  if (f.pegawaiId) syarat.push(eq(kegiatan.penanggungJawabId, f.pegawaiId));
  if (f.status) syarat.push(kondisiStatus(f.status, sekarang));
  if (f.pemeriksaan) syarat.push(eq(kegiatan.statusPemeriksaan, f.pemeriksaan));
  if (f.rentang) syarat.push(kondisiRentang(f.rentang));
  if (f.q) {
    /**
     * Nama penanggung jawab ikut dicari agar pimpinan bisa mengetik nama pegawai di kolom cari
     */
    const pegawaiCocok = db.select({ id: pegawai.id }).from(pegawai).where(mengandung(pegawai.nama, f.q));
    syarat.push(or(mengandung(kegiatan.judul, f.q), mengandung(kegiatan.lokasiNama, f.q), mengandung(kegiatan.uraian, f.q), inArray(kegiatan.penanggungJawabId, pegawaiCocok)));
  }
  if (f.milik) syarat.push(kondisiMilik(f.milik));
  if (f.lingkup) syarat.push(kondisiLingkup(f.lingkup));
  return and(...syarat)!;
}

/**
 * Kolom ringkas kegiatan untuk kalender dan dashboard
 */
export const PILIH_RINGKAS = {
  id: kegiatan.id,
  judul: kegiatan.judul,
  tglMulai: kegiatan.tglMulai,
  tglSelesai: kegiatan.tglSelesai,
  lokasiNama: kegiatan.lokasiNama,
  dibatalkanAt: kegiatan.dibatalkanAt,
  bidang: { id: bidang.id, nama: bidang.nama },
  jenis: { nama: jenisKegiatan.nama },
  penanggungJawab: { nama: pegawai.nama },
};

type BarisRingkas = {
  id: number;
  judul: string;
  tglMulai: Date;
  tglSelesai: Date;
  lokasiNama: string | null;
  dibatalkanAt: Date | null;
  bidang: { id: number; nama: string };
  jenis: { nama: string };
  penanggungJawab: { nama: string };
};

/**
 * SELECT kolom ringkas FROM kegiatan JOIN bidang, jenis_kegiatan, pegawai
 */
export function kueriRingkas() {
  return db
    .select(PILIH_RINGKAS)
    .from(kegiatan)
    .innerJoin(bidang, eq(kegiatan.bidangId, bidang.id))
    .innerJoin(jenisKegiatan, eq(kegiatan.jenisId, jenisKegiatan.id))
    .innerJoin(pegawai, eq(kegiatan.penanggungJawabId, pegawai.id));
}

/**
 * Meratakan baris ringkas: nama jenis & penanggung jawab jadi teks, plus status pelaksanaan
 */
export function ratakanRingkas({ dibatalkanAt, jenis, penanggungJawab, ...k }: BarisRingkas, sekarang: Date) {
  return {
    ...k,
    jenis: jenis.nama,
    penanggungJawab: penanggungJawab.nama,
    statusPelaksanaan: hitungStatus({ dibatalkanAt, tglMulai: k.tglMulai, tglSelesai: k.tglSelesai }, sekarang),
  };
}

export const KegiatanRepository = {
  /**
   * Daftar kegiatan sesuai filter dengan paginasi, beserta jumlah totalnya
   */
  async daftar(f: FilterDaftar, sekarang: Date, halaman: Halaman) {
    const where = kondisiDaftar(f, sekarang);
    const [baris, total] = await Promise.all([
      db
        .select({
          id: kegiatan.id,
          judul: kegiatan.judul,
          tglMulai: kegiatan.tglMulai,
          tglSelesai: kegiatan.tglSelesai,
          lokasiNama: kegiatan.lokasiNama,
          dibatalkanAt: kegiatan.dibatalkanAt,
          bidang: { id: bidang.id, nama: bidang.nama },
          jenis: { id: jenisKegiatan.id, nama: jenisKegiatan.nama },
          penanggungJawab: { id: pegawai.id, nama: pegawai.nama },
          dibuatOleh: kegiatan.dibuatOleh,
          statusPemeriksaan: kegiatan.statusPemeriksaan,
          updatedAt: kegiatan.updatedAt,
        })
        .from(kegiatan)
        .innerJoin(bidang, eq(kegiatan.bidangId, bidang.id))
        .innerJoin(jenisKegiatan, eq(kegiatan.jenisId, jenisKegiatan.id))
        .innerJoin(pegawai, eq(kegiatan.penanggungJawabId, pegawai.id))
        .where(where)
        .orderBy(desc(kegiatan.tglMulai), desc(kegiatan.id))

        /**
         * KONSEP paginasi: halaman 3 dengan 20 baris per halaman berarti lewati 40 baris pertama (offset) lalu ambil 20 (limit).
         */
        .limit(halaman.pageSize)
        .offset((halaman.page - 1) * halaman.pageSize),

      /**
       * Jumlah total dihitung terpisah agar frontend bisa menampilkan "1-20 dari 134" dan jumlah halaman.
       */
      db.$count(kegiatan, where),
    ]);
    const items = baris.map(({ dibatalkanAt, ...k }) => ({ ...k, statusPelaksanaan: hitungStatus({ dibatalkanAt, ...k }, sekarang) }));
    return { items, total };
  },

  /**
   * Kegiatan yang beririsan dengan rentang waktu (untuk kalender), maksimal `batas` baris
   */
  async kalender(rentang: Rentang, lingkup: LingkupBaca | undefined, sekarang: Date, batas: number) {
    const baris = await kueriRingkas()
      .where(
        and(
          KEGIATAN_AKTIF,

          /**
           * Syarat "beririsan": kegiatan mulai sebelum rentang berakhir DAN selesai setelah rentang dimulai, jadi kegiatan beberapa hari yang melewati awal bulan tetap tampil.
           */
          lt(kegiatan.tglMulai, rentang.akhir),
          gte(kegiatan.tglSelesai, rentang.mulai),
          lingkup ? kondisiLingkup(lingkup) : undefined,
        ),
      )
      .orderBy(asc(kegiatan.tglMulai), asc(kegiatan.id))
      .limit(batas);
    return baris.map((k) => ratakanRingkas(k, sekarang));
  },

  /**
   * Detail satu kegiatan aktif beserta jenis, unit (dan induknya), penanggung jawab, dan pembuat
   */
  async detail(id: number, sekarang: Date) {
    const induk = alias(bidang, "induk");
    const [k] = await db
      .select({
        id: kegiatan.id,
        judul: kegiatan.judul,
        uraian: kegiatan.uraian,
        hasil: kegiatan.hasil,
        tglMulai: kegiatan.tglMulai,
        tglSelesai: kegiatan.tglSelesai,
        lokasiNama: kegiatan.lokasiNama,
        lat: kegiatan.lat,
        lng: kegiatan.lng,
        jumlahPeserta: kegiatan.jumlahPeserta,
        refEksternal: kegiatan.refEksternal,
        dibatalkanAt: kegiatan.dibatalkanAt,
        alasanBatal: kegiatan.alasanBatal,
        jenis: { id: jenisKegiatan.id, nama: jenisKegiatan.nama },
        bidang: { id: bidang.id, nama: bidang.nama },
        unitInduk: { id: induk.id, nama: induk.nama },
        penanggungJawab: { id: pegawai.id, nama: pegawai.nama },
        pembuat: { id: user.id, nama: user.name },
        statusPemeriksaan: kegiatan.statusPemeriksaan,
        createdAt: kegiatan.createdAt,
        updatedAt: kegiatan.updatedAt,
      })
      .from(kegiatan)
      .innerJoin(jenisKegiatan, eq(kegiatan.jenisId, jenisKegiatan.id))
      .innerJoin(bidang, eq(kegiatan.bidangId, bidang.id))
      .leftJoin(induk, eq(bidang.parentId, induk.id))
      .innerJoin(pegawai, eq(kegiatan.penanggungJawabId, pegawai.id))
      .innerJoin(user, eq(kegiatan.dibuatOleh, user.id))
      .where(and(eq(kegiatan.id, id), KEGIATAN_AKTIF))
      .limit(1);
    if (!k) return undefined;
    return { ...k, lat: angka(k.lat), lng: angka(k.lng), statusPelaksanaan: hitungStatus(k, sekarang) };
  },

  /**
   * Daftar berkas dokumentasi sebuah kegiatan
   */
  daftarDokumentasi(kegiatanId: number) {
    return db
      .select({ id: dokumentasi.id, namaAsli: dokumentasi.namaAsli, mime: dokumentasi.mime, ukuran: dokumentasi.ukuran, createdAt: dokumentasi.createdAt })
      .from(dokumentasi)
      .where(eq(dokumentasi.kegiatanId, kegiatanId))
      .orderBy(asc(dokumentasi.id));
  },

  /**
   * Riwayat catatan pemeriksaan pimpinan, terbaru di atas
   */
  daftarCatatan(kegiatanId: number) {
    return db
      .select({ id: catatanPemeriksaan.id, status: catatanPemeriksaan.status, isi: catatanPemeriksaan.isi, pemeriksa: user.name, waktu: catatanPemeriksaan.createdAt })
      .from(catatanPemeriksaan)
      .innerJoin(user, eq(catatanPemeriksaan.pemeriksaId, user.id))
      .where(eq(catatanPemeriksaan.kegiatanId, kegiatanId))
      .orderBy(desc(catatanPemeriksaan.id));
  },

  /**
   * Mengubah status pemeriksaan tanpa menaikkan versi (updatedAt diisi nilai lama)
   */
  async setPemeriksaan(id: number, status: string, versi: Date, tx: Db) {
    await tx.update(kegiatan).set({ statusPemeriksaan: status, updatedAt: versi }).where(eq(kegiatan.id, id));
  },

  /**
   * Menyimpan satu catatan pemeriksaan
   */
  async insertCatatan(nilai: { kegiatanId: number; pemeriksaId: string; status: string; isi: string | null }, tx: Db) {
    await tx.insert(catatanPemeriksaan).values(nilai);
  },

  /**
   * Mengunci baris kegiatan aktif (SELECT ... FOR UPDATE) lalu mengambil isinya; harus di dalam transaksi
   */
  async kunciAktif(id: number, tx: Db) {
    const [k] = await tx
      .select()
      .from(kegiatan)
      .where(and(eq(kegiatan.id, id), KEGIATAN_AKTIF))
      .for("update");
    return k;
  },

  /**
   * Menyimpan kegiatan baru dan mengembalikan id-nya
   */
  async insert(nilai: NilaiKegiatan & { dibuatOleh: string }, tx: Db) {
    const [baru] = await tx.insert(kegiatan).values(nilai).returning({ id: kegiatan.id });
    return baru!.id;
  },

  /**
   * Mengubah kegiatan hanya bila versinya (updatedAt) masih sama; mengembalikan jumlah baris yang berubah
   */
  async updateDenganVersi(id: number, versi: Date, nilai: Partial<typeof kegiatan.$inferInsert>, tx: Db) {
    const hasil = await tx
      .update(kegiatan)
      .set(nilai)
      .where(and(eq(kegiatan.id, id), eq(kegiatan.updatedAt, versi), KEGIATAN_AKTIF));
    return hasil.rowCount ?? 0;
  },

  /**
   * Menghapus kegiatan secara lunak (mengisi deletedAt)
   */
  async softDelete(id: number, tx: Db) {
    await tx
      .update(kegiatan)
      .set({ deletedAt: new Date() })
      .where(and(eq(kegiatan.id, id), KEGIATAN_AKTIF));
  },

  /**
   * Baris kegiatan lengkap untuk berkas ekspor PDF
   */
  async untukEkspor(f: FilterDaftar, sekarang: Date, batas: number) {
    const baris = await db
      .select({
        id: kegiatan.id,
        judul: kegiatan.judul,
        jenis: jenisKegiatan.nama,
        bidang: bidang.nama,
        bidangId: kegiatan.bidangId,
        penanggungJawab: pegawai.nama,
        tglMulai: kegiatan.tglMulai,
        tglSelesai: kegiatan.tglSelesai,
        lokasiNama: kegiatan.lokasiNama,
        lat: kegiatan.lat,
        lng: kegiatan.lng,
        jumlahPeserta: kegiatan.jumlahPeserta,
        uraian: kegiatan.uraian,
        hasil: kegiatan.hasil,
        alasanBatal: kegiatan.alasanBatal,
        refEksternal: kegiatan.refEksternal,
        dibatalkanAt: kegiatan.dibatalkanAt,
      })
      .from(kegiatan)
      .innerJoin(jenisKegiatan, eq(kegiatan.jenisId, jenisKegiatan.id))
      .innerJoin(bidang, eq(kegiatan.bidangId, bidang.id))
      .innerJoin(pegawai, eq(kegiatan.penanggungJawabId, pegawai.id))
      .where(kondisiDaftar(f, sekarang))
      .orderBy(desc(kegiatan.tglMulai), desc(kegiatan.id))
      .limit(batas);
    return baris.map(({ dibatalkanAt, ...k }) => ({
      ...k,
      lat: angka(k.lat),
      lng: angka(k.lng),
      statusPelaksanaan: hitungStatus({ dibatalkanAt, ...k }, sekarang),
    }));
  },

  /**
   * Mengambil satu baris kegiatan apa adanya
   */
  async findById(id: number, tx: Db = db) {
    const [k] = await tx.select().from(kegiatan).where(eq(kegiatan.id, id)).limit(1);
    return k;
  },
};
