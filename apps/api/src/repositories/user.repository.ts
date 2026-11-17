import { and, asc, desc, eq, gt, inArray, ne, not, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { bidang, catatanPemeriksaan, dokumentasi, kegiatan, pegawai, session, user } from "@/db/schema";
import { db, memuat, mengandung, type Db } from "@/db";
import type { Halaman, Role, StatusAkun } from "@/types/umum.types";
import type { FilterAkun } from "@/validators/user.validator";
import { kondisiStatus, punyaKredensial } from "@/utils/status-akun";

const PILIH_AKUN = {
  id: user.id,
  name: user.name,
  email: user.email,
  emailBaru: user.emailBaru,
  emailVerified: user.emailVerified,
  role: user.role,
  banned: user.banned,
  banReason: user.banReason,
  pegawaiId: user.pegawaiId,
  lockedUntil: user.lockedUntil,
  createdAt: user.createdAt,
  punyaKredensial,
};

function kondisi(f: FilterAkun) {
  const nipCocok = f.q ? db.select({ id: pegawai.id }).from(pegawai).where(memuat(pegawai.nip, f.q)) : undefined;
  return and(
    f.q && nipCocok ? or(mengandung(user.name, f.q), mengandung(user.email, f.q), inArray(user.pegawaiId, nipCocok)) : undefined,
    f.status ? kondisiStatus(f.status) : undefined,
    f.nonaktif === undefined ? undefined : f.nonaktif ? kondisiStatus("NONAKTIF") : not(kondisiStatus("NONAKTIF")),
    f.role ? eq(user.role, f.role) : undefined,
  );
}

export const UserRepository = {
  hitungStatus(status: StatusAkun) {
    return db.$count(user, kondisiStatus(status));
  },

  async daftar(f: FilterAkun, halaman: Halaman) {
    const where = kondisi(f);
    const induk = alias(bidang, "induk");
    const [baris, total] = await Promise.all([
      db
        .select({
          ...PILIH_AKUN,
          image: user.image,
          pegawai: { id: pegawai.id, nama: pegawai.nama, nip: pegawai.nip },
          bidang: { id: bidang.id, nama: bidang.nama },
          unitInduk: induk.nama,
        })
        .from(user)
        .leftJoin(pegawai, eq(user.pegawaiId, pegawai.id))
        .leftJoin(bidang, eq(pegawai.bidangId, bidang.id))
        .leftJoin(induk, eq(bidang.parentId, induk.id))
        .where(where)
        .orderBy(desc(kondisiStatus("MENUNGGU_AKTIVASI")), asc(user.name), asc(user.id))
        .limit(halaman.pageSize)
        .offset((halaman.page - 1) * halaman.pageSize),
      db.$count(user, where),
    ]);
    const items = baris.map(({ pegawai: p, bidang: b, unitInduk, ...a }) => ({
      ...a,
      pegawai: p && b ? { id: p.id, nama: p.nama, nip: p.nip, bidangId: b.id, bidang: b.nama, unitInduk } : null,
    }));
    return { items, total };
  },

  async byId(id: string, tx: Db = db) {
    const [a] = await tx.select(PILIH_AKUN).from(user).where(eq(user.id, id)).limit(1);
    return a;
  },

  async detail(id: string, sekarang = new Date()) {
    const induk = alias(bidang, "induk");
    const [baris] = await db
      .select({
        akun: { ...PILIH_AKUN, image: user.image, kontak: user.kontak, updatedAt: user.updatedAt },
        pegawai: { id: pegawai.id, nip: pegawai.nip, nama: pegawai.nama, aktif: pegawai.aktif },
        bidang: { id: bidang.id, nama: bidang.nama },
        induk: { id: induk.id, nama: induk.nama },
      })
      .from(user)
      .leftJoin(pegawai, eq(user.pegawaiId, pegawai.id))
      .leftJoin(bidang, eq(pegawai.bidangId, bidang.id))
      .leftJoin(induk, eq(bidang.parentId, induk.id))
      .where(eq(user.id, id))
      .limit(1);
    if (!baris) return undefined;
    const sessions = await db
      .select({ id: session.id, ipAddress: session.ipAddress, userAgent: session.userAgent, createdAt: session.createdAt, updatedAt: session.updatedAt, expiresAt: session.expiresAt })
      .from(session)
      .where(and(eq(session.userId, id), gt(session.expiresAt, sekarang)))
      .orderBy(desc(session.updatedAt));
    return {
      ...baris.akun,
      pegawai: baris.pegawai ? { ...baris.pegawai, bidang: { ...baris.bidang!, parent: baris.induk } } : null,
      sessions,
    };
  },

  async insert(nilai: { id: string; name: string; email: string; role: Role; pegawaiId: number | null }, tx: Db) {
    await tx.insert(user).values({ ...nilai, emailVerified: false });
  },

  async update(id: string, data: Partial<typeof user.$inferInsert>, tx: Db) {
    await tx.update(user).set(data).where(eq(user.id, id));
  },

  async hapus(id: string, tx: Db) {
    await tx.delete(user).where(eq(user.id, id));
  },

  async akunLainUntukPegawai(pegawaiId: number, kecualiUserId?: string) {
    const [u] = await db
      .select({ id: user.id, email: user.email })
      .from(user)
      .where(and(eq(user.pegawaiId, pegawaiId), kecualiUserId ? ne(user.id, kecualiUserId) : undefined))
      .limit(1);
    return u;
  },

  async pegawaiByNip(nip: string) {
    const [p] = await db.select({ id: pegawai.id, nama: pegawai.nama, aktif: pegawai.aktif }).from(pegawai).where(eq(pegawai.nip, nip)).limit(1);
    return p;
  },

  async pegawai(id: number) {
    const [p] = await db.select({ id: pegawai.id, nip: pegawai.nip, bidangId: pegawai.bidangId, aktif: pegawai.aktif }).from(pegawai).where(eq(pegawai.id, id)).limit(1);
    return p;
  },

  async terpakai(ids: string[]) {
    if (!ids.length) return new Set<string>();
    const [pembuat, pengunggah, pemeriksa] = await Promise.all([
      db.selectDistinct({ id: kegiatan.dibuatOleh }).from(kegiatan).where(inArray(kegiatan.dibuatOleh, ids)),
      db.selectDistinct({ id: dokumentasi.diunggahOleh }).from(dokumentasi).where(inArray(dokumentasi.diunggahOleh, ids)),
      db.selectDistinct({ id: catatanPemeriksaan.pemeriksaId }).from(catatanPemeriksaan).where(inArray(catatanPemeriksaan.pemeriksaId, ids)),
    ]);
    return new Set([...pembuat, ...pengunggah, ...pemeriksa].map((b) => b.id));
  },
};
