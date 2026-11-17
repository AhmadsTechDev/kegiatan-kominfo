import { and, asc, desc, eq, gt, gte, inArray, isNotNull, isNull, lt, lte, or, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { bidang, catatanPemeriksaan, dokumentasi, jenisKegiatan, kegiatan, pegawai, user } from "@/db/schema";
import { db, mengandung, type Db } from "@/db";
import type { FilterDaftar, LingkupBaca, NilaiKegiatan } from "@/types/kegiatan.types";
import type { Halaman, Milik, Rentang, StatusPelaksanaan } from "@/types/umum.types";
import { angka, hitungStatus } from "@/utils/status-kegiatan";

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

export const KEGIATAN_AKTIF = isNull(kegiatan.deletedAt);

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

export function kondisiMilik({ userId, pegawaiId }: Milik): SQL {
  return pegawaiId == null ? eq(kegiatan.dibuatOleh, userId) : or(eq(kegiatan.dibuatOleh, userId), eq(kegiatan.penanggungJawabId, pegawaiId))!;
}

export function kondisiLingkup({ unitIds, milik }: LingkupBaca): SQL {
  return unitIds.length > 0 ? or(inArray(kegiatan.bidangId, unitIds), kondisiMilik(milik))! : kondisiMilik(milik);
}

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

export const kondisiRentang = ({ mulai, akhir }: Rentang) => and(gte(kegiatan.tglMulai, mulai), lt(kegiatan.tglMulai, akhir))!;

export function kondisiDaftar(f: FilterDaftar, sekarang: Date): SQL {
  const syarat: (SQL | undefined)[] = [KEGIATAN_AKTIF];
  if (f.unitIds) syarat.push(inArray(kegiatan.bidangId, f.unitIds));
  if (f.jenisId) syarat.push(eq(kegiatan.jenisId, f.jenisId));
  if (f.pegawaiId) syarat.push(eq(kegiatan.penanggungJawabId, f.pegawaiId));
  if (f.status) syarat.push(kondisiStatus(f.status, sekarang));
  if (f.pemeriksaan) syarat.push(eq(kegiatan.statusPemeriksaan, f.pemeriksaan));
  if (f.rentang) syarat.push(kondisiRentang(f.rentang));
  if (f.q) {
    const pegawaiCocok = db.select({ id: pegawai.id }).from(pegawai).where(mengandung(pegawai.nama, f.q));
    syarat.push(or(mengandung(kegiatan.judul, f.q), mengandung(kegiatan.lokasiNama, f.q), mengandung(kegiatan.uraian, f.q), inArray(kegiatan.penanggungJawabId, pegawaiCocok)));
  }
  if (f.milik) syarat.push(kondisiMilik(f.milik));
  if (f.lingkup) syarat.push(kondisiLingkup(f.lingkup));
  return and(...syarat)!;
}

export function kueriRingkas() {
  return db
    .select(PILIH_RINGKAS)
    .from(kegiatan)
    .innerJoin(bidang, eq(kegiatan.bidangId, bidang.id))
    .innerJoin(jenisKegiatan, eq(kegiatan.jenisId, jenisKegiatan.id))
    .innerJoin(pegawai, eq(kegiatan.penanggungJawabId, pegawai.id));
}

export function ratakanRingkas({ dibatalkanAt, jenis, penanggungJawab, ...k }: BarisRingkas, sekarang: Date) {
  return {
    ...k,
    jenis: jenis.nama,
    penanggungJawab: penanggungJawab.nama,
    statusPelaksanaan: hitungStatus({ dibatalkanAt, tglMulai: k.tglMulai, tglSelesai: k.tglSelesai }, sekarang),
  };
}

export const KegiatanRepository = {
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

        .limit(halaman.pageSize)
        .offset((halaman.page - 1) * halaman.pageSize),

      db.$count(kegiatan, where),
    ]);
    const items = baris.map(({ dibatalkanAt, ...k }) => ({ ...k, statusPelaksanaan: hitungStatus({ dibatalkanAt, ...k }, sekarang) }));
    return { items, total };
  },

  async kalender(rentang: Rentang, lingkup: LingkupBaca | undefined, sekarang: Date, batas: number) {
    const baris = await kueriRingkas()
      .where(
        and(
          KEGIATAN_AKTIF,

          lt(kegiatan.tglMulai, rentang.akhir),
          gte(kegiatan.tglSelesai, rentang.mulai),
          lingkup ? kondisiLingkup(lingkup) : undefined,
        ),
      )
      .orderBy(asc(kegiatan.tglMulai), asc(kegiatan.id))
      .limit(batas);
    return baris.map((k) => ratakanRingkas(k, sekarang));
  },

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

  daftarDokumentasi(kegiatanId: number) {
    return db
      .select({ id: dokumentasi.id, namaAsli: dokumentasi.namaAsli, mime: dokumentasi.mime, ukuran: dokumentasi.ukuran, createdAt: dokumentasi.createdAt })
      .from(dokumentasi)
      .where(eq(dokumentasi.kegiatanId, kegiatanId))
      .orderBy(asc(dokumentasi.id));
  },

  daftarCatatan(kegiatanId: number) {
    return db
      .select({ id: catatanPemeriksaan.id, status: catatanPemeriksaan.status, isi: catatanPemeriksaan.isi, pemeriksa: user.name, waktu: catatanPemeriksaan.createdAt })
      .from(catatanPemeriksaan)
      .innerJoin(user, eq(catatanPemeriksaan.pemeriksaId, user.id))
      .where(eq(catatanPemeriksaan.kegiatanId, kegiatanId))
      .orderBy(desc(catatanPemeriksaan.id));
  },

  async setPemeriksaan(id: number, status: string, versi: Date, tx: Db) {
    await tx.update(kegiatan).set({ statusPemeriksaan: status, updatedAt: versi }).where(eq(kegiatan.id, id));
  },

  async insertCatatan(nilai: { kegiatanId: number; pemeriksaId: string; status: string; isi: string | null }, tx: Db) {
    await tx.insert(catatanPemeriksaan).values(nilai);
  },

  async kunciAktif(id: number, tx: Db) {
    const [k] = await tx
      .select()
      .from(kegiatan)
      .where(and(eq(kegiatan.id, id), KEGIATAN_AKTIF))
      .for("update");
    return k;
  },

  async insert(nilai: NilaiKegiatan & { dibuatOleh: string }, tx: Db) {
    const [baru] = await tx.insert(kegiatan).values(nilai).returning({ id: kegiatan.id });
    return baru!.id;
  },

  async updateDenganVersi(id: number, versi: Date, nilai: Partial<typeof kegiatan.$inferInsert>, tx: Db) {
    const hasil = await tx
      .update(kegiatan)
      .set(nilai)
      .where(and(eq(kegiatan.id, id), eq(kegiatan.updatedAt, versi), KEGIATAN_AKTIF));
    return hasil.rowCount ?? 0;
  },

  async softDelete(id: number, tx: Db) {
    await tx
      .update(kegiatan)
      .set({ deletedAt: new Date() })
      .where(and(eq(kegiatan.id, id), KEGIATAN_AKTIF));
  },

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

  async findById(id: number, tx: Db = db) {
    const [k] = await tx.select().from(kegiatan).where(eq(kegiatan.id, id)).limit(1);
    return k;
  },
};
