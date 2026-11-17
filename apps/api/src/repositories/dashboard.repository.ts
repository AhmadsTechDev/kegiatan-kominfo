import { and, asc, count, desc, eq, isNotNull, isNull, notExists, or, sql, type SQL } from "drizzle-orm";
import { bidang, dokumentasi, jenisKegiatan, kegiatan, pegawai } from "@/db/schema";
import { db } from "@/db";
import type { Milik, Rentang } from "@/types/umum.types";
import { angka } from "@/utils/status-kegiatan";
import { KEGIATAN_AKTIF, kondisiMilik, kondisiRentang, kondisiStatus, kueriRingkas, PILIH_RINGKAS, ratakanRingkas } from "./kegiatan.repository";

const TANPA_DOKUMENTASI = notExists(
  db
    .select({ satu: sql`1` })
    .from(dokumentasi)
    .where(eq(dokumentasi.kegiatanId, kegiatan.id)),
);

const dalamRentang = (rentang: Rentang) => and(KEGIATAN_AKTIF, kondisiRentang(rentang))!;

async function daftarRingkas(where: SQL, urut: SQL, batas: number, sekarang: Date) {
  const baris = await kueriRingkas().where(where).orderBy(urut).limit(batas);
  return baris.map((b) => {
    const k = ratakanRingkas(b, sekarang);
    return { ...k, bidang: k.bidang.nama };
  });
}

async function daftarDenganTotal(where: SQL, urut: SQL, batas: number, sekarang: Date) {
  const [items, total] = await Promise.all([daftarRingkas(where, urut, batas, sekarang), db.$count(kegiatan, where)]);
  return { total, items };
}

export const DashboardRepository = {
  async hitungKpi(rentang: Rentang, sekarang: Date) {
    const dasar = dalamRentang(rentang);
    const [total, berlangsung, akanDatang, selesai] = await Promise.all([
      db.$count(kegiatan, dasar),
      db.$count(kegiatan, and(dasar, kondisiStatus("berlangsung", sekarang))),
      db.$count(kegiatan, and(dasar, kondisiStatus("akan_datang", sekarang))),
      db.$count(kegiatan, and(dasar, kondisiStatus("selesai", sekarang))),
    ]);
    return { total, berlangsung, akanDatang, selesai };
  },

  hitungTotal(rentang: Rentang) {
    return db.$count(kegiatan, dalamRentang(rentang));
  },

  async jumlahPerBulanUnitInduk(bulanAwal: string, bulanAkhir: string) {
    const hasil = await db.execute<{ bulan: string; unitIndukId: number; jumlah: number }>(sql`
      SELECT bulan, unit_induk_id AS "unitIndukId", SUM(jumlah)::int AS jumlah
      FROM v_rekap_bulanan
      WHERE bulan BETWEEN ${bulanAwal} AND ${bulanAkhir}
      GROUP BY bulan, unit_induk_id`);
    return hasil.rows;
  },

  daftarUnitInduk() {
    return db
      .select({ id: bidang.id, kode: bidang.kode, nama: bidang.nama })
      .from(bidang)
      .where(and(isNull(bidang.parentId), eq(bidang.aktif, true)))
      .orderBy(asc(bidang.id));
  },

  jumlahPerJenis(rentang: Rentang) {
    return db
      .select({ id: jenisKegiatan.id, nama: jenisKegiatan.nama, jumlah: count() })
      .from(kegiatan)
      .innerJoin(jenisKegiatan, eq(kegiatan.jenisId, jenisKegiatan.id))
      .where(dalamRentang(rentang))
      .groupBy(jenisKegiatan.id, jenisKegiatan.nama)
      .orderBy(desc(count()));
  },

  jenisAktif() {
    return db.select({ id: jenisKegiatan.id, nama: jenisKegiatan.nama }).from(jenisKegiatan).where(eq(jenisKegiatan.aktif, true)).orderBy(asc(jenisKegiatan.nama));
  },

  async titikPeta(rentang: Rentang, sekarang: Date) {
    const baris = await db
      .select({ ...PILIH_RINGKAS, lat: kegiatan.lat, lng: kegiatan.lng })
      .from(kegiatan)
      .innerJoin(bidang, eq(kegiatan.bidangId, bidang.id))
      .innerJoin(jenisKegiatan, eq(kegiatan.jenisId, jenisKegiatan.id))
      .innerJoin(pegawai, eq(kegiatan.penanggungJawabId, pegawai.id))
      .where(and(dalamRentang(rentang), isNotNull(kegiatan.lat), isNotNull(kegiatan.lng)));
    return baris.map(({ lat, lng, ...b }) => {
      const k = ratakanRingkas(b, sekarang);
      return { ...k, bidang: k.bidang.nama, lat: angka(lat)!, lng: angka(lng)! };
    });
  },

  akanDatang(sekarang: Date, batas: number) {
    return daftarRingkas(and(KEGIATAN_AKTIF, kondisiStatus("akan_datang", sekarang))!, asc(kegiatan.tglMulai), batas, sekarang);
  },

  milikTanpaDokumentasi(milik: Milik, sekarang: Date, batas: number) {
    const where = and(KEGIATAN_AKTIF, kondisiMilik(milik), kondisiStatus("selesai", sekarang), TANPA_DOKUMENTASI)!;
    return daftarDenganTotal(where, desc(kegiatan.tglSelesai), batas, sekarang);
  },

  agendaMilik(milik: Milik, sekarang: Date, batas: number) {
    const where = and(KEGIATAN_AKTIF, kondisiMilik(milik), or(kondisiStatus("berlangsung", sekarang), kondisiStatus("akan_datang", sekarang)))!;
    return daftarDenganTotal(where, asc(kegiatan.tglMulai), batas, sekarang);
  },
};
