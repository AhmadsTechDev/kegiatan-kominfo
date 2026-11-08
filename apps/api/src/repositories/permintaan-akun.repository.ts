import { and, desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { bidang, pegawai, permintaanAkun, user } from "@/db/schema";
import { db, type Db } from "@/lib/db";
import type { Halaman, StatusPermintaan } from "@/types/umum.types";

type BarisBaru = { pegawaiId: number | null; nama: string; email: string; catatan: string | null; ip: string | null };

export const PermintaanAkunRepository = {
  /**
   * Menyimpan permintaan akun baru dan mengembalikan id-nya
   */
  async insert(nilai: BarisBaru) {
    const [baru] = await db.insert(permintaanAkun).values(nilai).returning({ id: permintaanAkun.id });
    return baru!.id;
  },

  /**
   * Permintaan yang masih menunggu untuk pegawai tertentu
   */
  async menungguUntukPegawai(pegawaiId: number) {
    const [p] = await db
      .select({ id: permintaanAkun.id })
      .from(permintaanAkun)
      .where(and(eq(permintaanAkun.pegawaiId, pegawaiId), eq(permintaanAkun.status, "MENUNGGU")))
      .limit(1);
    return p;
  },

  /**
   * Permintaan yang masih menunggu untuk email tertentu
   */
  async menungguUntukEmail(email: string) {
    const [p] = await db
      .select({ id: permintaanAkun.id })
      .from(permintaanAkun)
      .where(and(eq(permintaanAkun.email, email), eq(permintaanAkun.status, "MENUNGGU")))
      .limit(1);
    return p;
  },

  /**
   * Daftar permintaan akun terbaru dengan filter status dan paginasi
   */
  async daftar(status: StatusPermintaan | undefined, halaman: Halaman) {
    const where = status ? eq(permintaanAkun.status, status) : undefined;
    const pemroses = alias(user, "pemroses");
    const [baris, total] = await Promise.all([
      db
        .select({
          id: permintaanAkun.id,
          nama: permintaanAkun.nama,
          email: permintaanAkun.email,
          catatan: permintaanAkun.catatan,
          status: permintaanAkun.status,
          alasanTolak: permintaanAkun.alasanTolak,
          diprosesAt: permintaanAkun.diprosesAt,
          diprosesOleh: pemroses.name,
          createdAt: permintaanAkun.createdAt,
          pegawai: { id: pegawai.id, nip: pegawai.nip, nama: pegawai.nama },
          bidang: bidang.nama,
        })
        .from(permintaanAkun)
        .leftJoin(pemroses, eq(permintaanAkun.diprosesOleh, pemroses.id))
        .leftJoin(pegawai, eq(permintaanAkun.pegawaiId, pegawai.id))
        .leftJoin(bidang, eq(pegawai.bidangId, bidang.id))
        .where(where)
        .orderBy(desc(permintaanAkun.id))
        .limit(halaman.pageSize)
        .offset((halaman.page - 1) * halaman.pageSize),
      db.$count(permintaanAkun, where),
    ]);
    return { items: baris, total };
  },

  /**
   * Jumlah permintaan yang menunggu persetujuan
   */
  jumlahMenunggu() {
    return db.$count(permintaanAkun, eq(permintaanAkun.status, "MENUNGGU"));
  },

  /**
   * Satu permintaan berdasarkan id
   */
  async byId(id: number, tx: Db = db) {
    const [p] = await tx.select().from(permintaanAkun).where(eq(permintaanAkun.id, id)).limit(1);
    return p;
  },

  /**
   * Menandai permintaan selesai HANYA bila statusnya masih MENUNGGU; mengembalikan true bila berhasil
   */
  async selesaikanJikaMenunggu(id: number, nilai: { status: StatusPermintaan; alasanTolak?: string | null; diprosesOleh: string }, tx: Db = db) {
    const hasil = await tx
      .update(permintaanAkun)
      .set({ ...nilai, diprosesAt: new Date() })
      .where(and(eq(permintaanAkun.id, id), eq(permintaanAkun.status, "MENUNGGU")));
    return (hasil.rowCount ?? 0) > 0;
  },

  /**
   * Mengembalikan permintaan ke status MENUNGGU (bila pembuatan akun gagal)
   */
  async kembalikanMenunggu(id: number) {
    await db.update(permintaanAkun).set({ status: "MENUNGGU", diprosesOleh: null, diprosesAt: null }).where(eq(permintaanAkun.id, id));
  },

  /**
   * Email semua admin yang aktif (penerima pemberitahuan)
   */
  async emailAdmin() {
    const baris = await db
      .select({ email: user.email })
      .from(user)
      .where(and(eq(user.role, "ADMIN"), eq(user.banned, false)));
    return baris.map((b) => b.email);
  },
};
