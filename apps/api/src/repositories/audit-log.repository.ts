import { prisma, Prisma, type Db } from "@/lib/prisma";
import type { FilterAudit } from "@/types/audit-log.types";
import type { Halaman } from "@/types/umum.types";

type BarisAudit = {
  aktorId: string | null;
  aksi: string;
  entitas: string;
  entitasId: string | null;
  dataSebelum: unknown;
  dataSesudah: unknown;
  ip: string | null;
  userAgent: string | null;
};

// Mengubah nilai JSON biasa menjadi input kolom Json Prisma (null harus memakai Prisma.DbNull)
const json = (nilai: unknown) => (nilai == null ? Prisma.DbNull : (nilai as Prisma.InputJsonValue));

// Menyusun `where` Prisma dari filter audit log
function kondisi(f: FilterAudit): Prisma.AuditLogWhereInput {
  return {
    aktorId: f.aktorId,
    aksi: f.aksi,
    entitas: f.entitas,
    createdAt: f.dari || f.sampai ? { gte: f.dari, lt: f.sampai } : undefined,
  };
}

// Mengambil nama & email aktor untuk sekumpulan id user (audit_log tidak punya relasi ke user)
async function petaAktor(ids: (string | null)[]) {
  const unik = [...new Set(ids.filter((id): id is string => id != null))];
  if (!unik.length) return new Map<string, { nama: string; email: string }>();
  const users = await prisma.user.findMany({ where: { id: { in: unik } }, select: { id: true, name: true, email: true } });
  return new Map(users.map((u) => [u.id, { nama: u.name, email: u.email }]));
}

// Menempelkan data aktor ke setiap baris audit; aktor null bila akunnya sudah dihapus
function denganAktor<T extends { aktorId: string | null }>(baris: T, peta: Map<string, { nama: string; email: string }>) {
  const { aktorId, ...sisa } = baris;
  const u = aktorId ? peta.get(aktorId) : undefined;
  return { ...sisa, aktor: { id: aktorId, nama: u?.nama ?? null, email: u?.email ?? null } };
}

export const AuditLogRepository = {
  // Menyimpan satu catatan audit (bisa di dalam transaksi lewat parameter db)
  async insert(baris: BarisAudit, db: Db = prisma) {
    await db.auditLog.create({ data: { ...baris, dataSebelum: json(baris.dataSebelum), dataSesudah: json(baris.dataSesudah) } });
  },

  // Daftar audit log terbaru dengan filter dan paginasi
  async daftar(f: FilterAudit, halaman: Halaman) {
    const where = kondisi(f);
    const [baris, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        select: { id: true, createdAt: true, aktorId: true, aksi: true, entitas: true, entitasId: true, ip: true },
        orderBy: { id: "desc" },
        take: halaman.pageSize,
        skip: (halaman.page - 1) * halaman.pageSize,
      }),
      prisma.auditLog.count({ where }),
    ]);
    const peta = await petaAktor(baris.map((b) => b.aktorId));
    const items = baris.map(({ id, createdAt, ...b }) => denganAktor({ id: Number(id), waktu: createdAt, ...b }, peta));
    return { items, total };
  },

  // Detail satu catatan audit termasuk data sebelum/sesudah
  async detail(id: number) {
    const b = await prisma.auditLog.findUnique({ where: { id } });
    if (!b) return undefined;
    const peta = await petaAktor([b.aktorId]);
    return denganAktor(
      {
        id: Number(b.id),
        waktu: b.createdAt,
        aktorId: b.aktorId,
        aksi: b.aksi,
        entitas: b.entitas,
        entitasId: b.entitasId,
        dataSebelum: b.dataSebelum,
        dataSesudah: b.dataSesudah,
        ip: b.ip,
        userAgent: b.userAgent,
      },
      peta,
    );
  },

  // Daftar akun yang pernah tercatat di audit log (untuk pilihan filter)
  async aktorTercatat() {
    const baris = await prisma.auditLog.findMany({ where: { aktorId: { not: null } }, distinct: ["aktorId"], select: { aktorId: true } });
    const users = await prisma.user.findMany({
      where: { id: { in: baris.map((b) => b.aktorId!) } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
    return users.map((u) => ({ id: u.id, nama: u.name, email: u.email }));
  },

  // Daftar nama entitas yang pernah tercatat (untuk pilihan filter)
  async entitasTercatat() {
    const baris = await prisma.auditLog.findMany({ distinct: ["entitas"], select: { entitas: true }, orderBy: { entitas: "asc" } });
    return baris.map((b) => b.entitas);
  },

  // Riwayat aksi pada satu kegiatan: buat/ubah/batal kegiatan dan perubahan dokumentasinya
  async riwayatKegiatan(kegiatanId: number, batas = 20) {
    const baris = await prisma.auditLog.findMany({
      where: {
        OR: [
          { entitas: "kegiatan", entitasId: String(kegiatanId), aksi: { in: ["buat", "ubah", "batal"] } },
          {
            entitas: "dokumentasi",
            OR: [{ dataSesudah: { path: ["kegiatanId"], equals: kegiatanId } }, { dataSebelum: { path: ["kegiatanId"], equals: kegiatanId } }],
          },
        ],
      },
      select: { id: true, aksi: true, aktorId: true, createdAt: true },
      orderBy: { id: "desc" },
      take: batas,
    });
    const peta = await petaAktor(baris.map((b) => b.aktorId));
    return baris.map((b) => ({ id: Number(b.id), aksi: b.aksi, aktor: b.aktorId ? (peta.get(b.aktorId)?.nama ?? null) : null, waktu: b.createdAt }));
  },

  // Siapa dan kapan terakhir mengubah/membatalkan kegiatan; null bila belum pernah
  async pengubahTerakhirKegiatan(kegiatanId: number) {
    const b = await prisma.auditLog.findFirst({
      where: { entitas: "kegiatan", entitasId: String(kegiatanId), aksi: { in: ["ubah", "batal"] }, aktorId: { not: null } },
      select: { aktorId: true, createdAt: true },
      orderBy: { id: "desc" },
    });
    if (!b) return null;
    const u = await prisma.user.findUnique({ where: { id: b.aktorId! }, select: { name: true } });
    return u ? { nama: u.name, waktu: b.createdAt } : null;
  },

  // Id user (dari daftar) yang pernah melakukan aksi selain gagal login
  async aktorPernahBeraksi(ids: string[]) {
    const baris = await prisma.auditLog.findMany({
      where: { aktorId: { in: ids }, aksi: { notIn: ["login_gagal", "akun_terkunci"] } },
      distinct: ["aktorId"],
      select: { aktorId: true },
    });
    return baris.map((b) => b.aktorId!);
  },
};
