import { and, asc, count, desc, eq, exists, inArray, isNotNull, notExists, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { bidang, jenisKegiatan, kegiatan, pegawai, permintaanAkun, user } from "@/db/schema";
import { berawalan, db, mengandung, type Db } from "@/lib/db";
import type { FilterPegawai, NilaiJenis, NilaiPegawai, NilaiUnit } from "@/types/master.types";
import type { Halaman } from "@/types/umum.types";
import { punyaKredensial } from "@/utils/status-akun";

/**
 * Subquery akun yang tertaut ke pegawai pada baris yang sedang dibaca
 */
const akunTertaut = (syarat?: SQL) =>
  db
    .select({ satu: sql`1` })
    .from(user)
    .where(and(eq(user.pegawaiId, pegawai.id), syarat));

/**
 * Menyusun WHERE dari filter daftar pegawai
 */
function kondisiPegawai(f: FilterPegawai) {
  return and(
    f.q ? or(mengandung(pegawai.nama, f.q), mengandung(pegawai.nip, f.q)) : undefined,
    f.unitIds ? inArray(pegawai.bidangId, f.unitIds) : undefined,
    f.aktif === undefined ? undefined : eq(pegawai.aktif, f.aktif),
    f.akun === "tanpa" ? notExists(akunTertaut()) : f.akun === "ada" ? exists(akunTertaut()) : undefined,
  );
}

export const MasterRepository = {
  /**
   * ---------- Bidang ----------
   */

  /**
   * Semua bidang dan sub bidang beserta nama induknya. Tingkat (jenis) ditentukan ada-tidaknya induk
   */
  async daftarUnit() {
    const induk = alias(bidang, "induk");
    const baris = await db
      .select({
        id: bidang.id,
        kode: bidang.kode,
        nama: bidang.nama,
        parentId: bidang.parentId,
        induk: induk.nama,
        aktif: bidang.aktif,
        updatedAt: bidang.updatedAt,
      })
      .from(bidang)
      .leftJoin(induk, eq(bidang.parentId, induk.id))
      .orderBy(asc(bidang.id));
    return baris.map((u) => ({ ...u, jenis: u.parentId === null ? "Bidang" : "Sub bidang" }));
  },

  /**
   * Jumlah pegawai aktif di setiap bidang
   */
  jumlahPegawaiPerUnit() {
    return db.select({ bidangId: pegawai.bidangId, jumlah: count() }).from(pegawai).where(eq(pegawai.aktif, true)).groupBy(pegawai.bidangId);
  },

  /**
   * Satu bidang berdasarkan id
   */
  async unitById(id: number, tx: Db = db) {
    const [b] = await tx.select().from(bidang).where(eq(bidang.id, id)).limit(1);
    return b;
  },

  /**
   * Jumlah sub bidang di bawah sebuah bidang (semua) dan yang masih aktif
   */
  jumlahTurunan(id: number) {
    return db.$count(bidang, eq(bidang.parentId, id));
  },

  jumlahTurunanAktif(id: number) {
    return db.$count(bidang, and(eq(bidang.parentId, id), eq(bidang.aktif, true)));
  },

  /**
   * Pemakaian sebuah bidang: semua pegawai (aktif atau tidak), semua kegiatan (termasuk yang dihapus lunak, karena
   * kunci asingnya tetap menahan), dan sub bidangnya. Bidang yang ketiganya nol boleh dihapus
   */
  async pemakaian(ids: number[]) {
    const [jumlahPegawai, jumlahKegiatan, jumlahTurunan] = await Promise.all([
      db.select({ id: pegawai.bidangId, jumlah: count() }).from(pegawai).where(inArray(pegawai.bidangId, ids)).groupBy(pegawai.bidangId),
      db.select({ id: kegiatan.bidangId, jumlah: count() }).from(kegiatan).where(inArray(kegiatan.bidangId, ids)).groupBy(kegiatan.bidangId),
      db.select({ id: bidang.parentId, jumlah: count() }).from(bidang).where(inArray(bidang.parentId, ids)).groupBy(bidang.parentId),
    ]);
    const peta = new Map<number, { pegawai: number; kegiatan: number; turunan: number }>(ids.map((id) => [id, { pegawai: 0, kegiatan: 0, turunan: 0 }]));
    for (const b of jumlahPegawai) peta.get(b.id)!.pegawai = b.jumlah;
    for (const b of jumlahKegiatan) peta.get(b.id)!.kegiatan = b.jumlah;
    for (const b of jumlahTurunan) if (b.id !== null) peta.get(b.id)!.turunan = b.jumlah;
    return peta;
  },

  /**
   * Menghapus bidang secara permanen (hanya dipanggil setelah dicek tidak dipakai)
   */
  async hapusUnit(id: number, tx: Db) {
    await tx.delete(bidang).where(eq(bidang.id, id));
  },

  /**
   * Jumlah pegawai aktif di sebuah unit
   */
  jumlahPegawaiAktif(unitId: number) {
    return db.$count(pegawai, and(eq(pegawai.bidangId, unitId), eq(pegawai.aktif, true)));
  },

  /**
   * Kode unit yang diawali teks tertentu (untuk membuat kode unik otomatis)
   */
  async kodeUnitBerawalan(awalan: string) {
    const baris = await db.select({ kode: bidang.kode }).from(bidang).where(berawalan(bidang.kode, awalan));
    return new Set(baris.map((b) => b.kode));
  },

  /**
   * Menyimpan bidang baru dan mengembalikan id-nya
   */
  async insertUnit(nilai: NilaiUnit, tx: Db) {
    const [baru] = await tx.insert(bidang).values(nilai).returning({ id: bidang.id });
    return baru!.id;
  },

  /**
   * Mengubah bidang
   */
  async updateUnit(id: number, nilai: Partial<NilaiUnit>, tx: Db) {
    await tx.update(bidang).set(nilai).where(eq(bidang.id, id));
  },

  /**
   * ---------- Pegawai ----------
   */

  /**
   * Daftar pegawai dengan filter dan paginasi, beserta bidang dan akun loginnya (bila ada).
   * Pegawai yang punya nomor telepon (kontak akun) tampil lebih dulu, tiap kelompok urut nama
   */
  async daftarPegawai(f: FilterPegawai, halaman: Halaman) {
    const where = kondisiPegawai(f);
    const adaTelp = exists(akunTertaut(isNotNull(user.kontak)));
    const [baris, total] = await Promise.all([
      db
        .select({
          id: pegawai.id,
          nip: pegawai.nip,
          nama: pegawai.nama,
          bidang: { id: bidang.id, nama: bidang.nama },
          aktif: pegawai.aktif,
          roleUndangan: pegawai.roleUndangan,
          updatedAt: pegawai.updatedAt,
          akun: { id: user.id, email: user.email, kontak: user.kontak },
          punyaKredensial,
        })
        .from(pegawai)
        .innerJoin(bidang, eq(pegawai.bidangId, bidang.id))
        .leftJoin(user, eq(user.pegawaiId, pegawai.id))
        .where(where)
        .orderBy(desc(adaTelp), asc(pegawai.nama), asc(pegawai.id))
        .limit(halaman.pageSize)
        .offset((halaman.page - 1) * halaman.pageSize),
      db.$count(pegawai, where),
    ]);
    const items = baris.map(({ akun, punyaKredensial: aktif, ...p }) => ({
      ...p,
      kontak: akun?.kontak ?? null,
      akun: akun ? { id: akun.id, email: akun.email, aktif } : null,
    }));
    return { items, total };
  },

  /**
   * Satu pegawai berdasarkan id
   */
  async pegawaiById(id: number, tx: Db = db) {
    const [p] = await tx.select().from(pegawai).where(eq(pegawai.id, id)).limit(1);
    return p;
  },

  /**
   * Menyimpan pegawai baru dan mengembalikan id-nya
   */
  async insertPegawai(nilai: NilaiPegawai, tx: Db) {
    const [baru] = await tx.insert(pegawai).values(nilai).returning({ id: pegawai.id });
    return baru!.id;
  },

  /**
   * Mengubah data pegawai
   */
  async updatePegawai(id: number, nilai: Partial<NilaiPegawai>, tx: Db) {
    await tx.update(pegawai).set(nilai).where(eq(pegawai.id, id));
  },

  /**
   * Pegawai pemilik NIP tertentu
   */
  async pegawaiDenganNip(nip: string) {
    const [p] = await db.select({ id: pegawai.id, nama: pegawai.nama }).from(pegawai).where(eq(pegawai.nip, nip)).limit(1);
    return p;
  },

  /**
   * Akun yang memakai email tertentu
   */
  async akunDenganEmail(email: string) {
    const [u] = await db.select({ id: user.id, name: user.name }).from(user).where(eq(user.email, email)).limit(1);
    return u;
  },

  /**
   * Menyamakan nama akun dengan nama pegawai yang baru diubah
   */
  async samakanNamaAkun(pegawaiId: number, nama: string, tx: Db) {
    await tx.update(user).set({ name: nama }).where(eq(user.pegawaiId, pegawaiId));
  },

  /**
   * Pemakaian satu pegawai: akun tertaut, kegiatan yang ditanggungjawabi (termasuk terhapus lunak), permintaan akun
   */
  async pemakaianPegawai(id: number) {
    const [akun, jumlahKegiatan, permintaan] = await Promise.all([
      db.$count(user, eq(user.pegawaiId, id)),
      db.$count(kegiatan, eq(kegiatan.penanggungJawabId, id)),
      db.$count(permintaanAkun, eq(permintaanAkun.pegawaiId, id)),
    ]);
    return { akun, kegiatan: jumlahKegiatan, permintaan };
  },

  async hapusPegawai(id: number, tx: Db) {
    await tx.delete(pegawai).where(eq(pegawai.id, id));
  },

  /**
   * Akun tertaut pegawai (satu pegawai paling banyak satu akun)
   */
  async akunPegawai(pegawaiId: number, tx: Db = db) {
    const [u] = await tx.select({ id: user.id, kontak: user.kontak }).from(user).where(eq(user.pegawaiId, pegawaiId)).limit(1);
    return u;
  },

  async ubahKontakAkun(userId: string, kontak: string | null, tx: Db) {
    await tx.update(user).set({ kontak }).where(eq(user.id, userId));
  },

  /**
   * ---------- Jenis kegiatan ----------
   */

  /**
   * Semua jenis kegiatan, urut nama
   */
  daftarJenis() {
    return db.select({ id: jenisKegiatan.id, nama: jenisKegiatan.nama, aktif: jenisKegiatan.aktif, updatedAt: jenisKegiatan.updatedAt }).from(jenisKegiatan).orderBy(asc(jenisKegiatan.nama));
  },

  /**
   * Jumlah kegiatan (termasuk yang dihapus) untuk setiap jenis
   */
  jumlahKegiatanPerJenis() {
    return db.select({ jenisId: kegiatan.jenisId, jumlah: count() }).from(kegiatan).groupBy(kegiatan.jenisId);
  },

  /**
   * Satu jenis kegiatan berdasarkan id
   */
  async jenisById(id: number, tx: Db = db) {
    const [j] = await tx.select().from(jenisKegiatan).where(eq(jenisKegiatan.id, id)).limit(1);
    return j;
  },

  /**
   * Menyimpan jenis kegiatan baru dan mengembalikan id-nya
   */
  async insertJenis(nilai: NilaiJenis, tx: Db) {
    const [baru] = await tx.insert(jenisKegiatan).values(nilai).returning({ id: jenisKegiatan.id });
    return baru!.id;
  },

  /**
   * Mengubah jenis kegiatan
   */
  async updateJenis(id: number, nilai: Partial<NilaiJenis>, tx: Db) {
    await tx.update(jenisKegiatan).set(nilai).where(eq(jenisKegiatan.id, id));
  },
};
