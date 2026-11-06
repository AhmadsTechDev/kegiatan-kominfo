import { prisma, type Db, type Prisma } from "@/lib/prisma";
import type { Halaman, Role, StatusAkun } from "@/types/umum.types";
import type { FilterAkun } from "@/types/user.types";
import { kondisiStatus } from "@/utils/status-akun";

const KREDENSIAL = { where: { providerId: "credential" }, select: { id: true } } as const;

/**
 * Kolom akun yang ditampilkan dan dicatat di audit log
 */
const PILIH_AKUN = {
  id: true,
  name: true,
  email: true,
  emailBaru: true,
  emailVerified: true,
  role: true,
  banned: true,
  banReason: true,
  pegawaiId: true,
  lockedUntil: true,
  createdAt: true,
  accounts: KREDENSIAL,
} satisfies Prisma.UserSelect;

/**
 * Mengganti daftar akun kredensial dengan penanda punyaKredensial
 */
function ringkas<T extends { accounts: unknown[] }>({ accounts, ...a }: T) {
  return { ...a, punyaKredensial: accounts.length > 0 };
}

/**
 * Menyusun `where` Prisma dari filter daftar akun
 */
function kondisi(f: FilterAkun): Prisma.UserWhereInput {
  const cari = f.q ? ({ contains: f.q, mode: "insensitive" } as const) : undefined;
  return {
    AND: [
      cari ? { OR: [{ name: cari }, { email: cari }, { pegawai: { nip: { contains: f.q } } }] } : {},
      f.status ? kondisiStatus(f.status) : {},
      f.nonaktif === undefined ? {} : f.nonaktif ? kondisiStatus("NONAKTIF") : { NOT: kondisiStatus("NONAKTIF") },
    ],
    role: f.role,
  };
}

export const UserRepository = {
  /**
   * Jumlah akun dengan status tertentu
   */
  hitungStatus(status: StatusAkun) {
    return prisma.user.count({ where: kondisiStatus(status) });
  },

  /**
   * Daftar akun dengan filter dan paginasi, beserta pegawai tertaut dan status kredensialnya.
   * Akun yang menunggu aktivasi selalu di atas (admin perlu memantaunya), lalu urut nama; keduanya dipaginasi sebagai satu daftar
   */
  async daftar(f: FilterAkun, halaman: Halaman) {
    const where = kondisi(f);
    const menunggu = kondisiStatus("MENUNGGU_AKTIVASI");
    const pilih = {
      ...PILIH_AKUN,
      image: true,
      pegawai: {
        select: {
          id: true,
          nama: true,
          nip: true,
          bidang: { select: { id: true, nama: true, parent: { select: { nama: true } } } },
        },
      },
    } satisfies Prisma.UserSelect;
    const urut = [{ name: "asc" }, { id: "asc" }] satisfies Prisma.UserOrderByWithRelationInput[];

    const [total, jumlahMenunggu] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.count({ where: { AND: [where, menunggu] } }),
    ]);
    const awal = (halaman.page - 1) * halaman.pageSize;
    const akhir = awal + halaman.pageSize;
    const diAtas =
      awal < jumlahMenunggu
        ? await prisma.user.findMany({ where: { AND: [where, menunggu] }, select: pilih, orderBy: urut, skip: awal, take: Math.min(jumlahMenunggu, akhir) - awal })
        : [];
    const sisaTake = halaman.pageSize - diAtas.length;
    const lainnya =
      sisaTake > 0
        ? await prisma.user.findMany({ where: { AND: [where, { NOT: menunggu }] }, select: pilih, orderBy: urut, skip: Math.max(0, awal - jumlahMenunggu), take: sisaTake })
        : [];
    const baris = [...diAtas, ...lainnya];
    const items = baris.map(({ pegawai, ...a }) => ({
      ...ringkas(a),
      pegawai: pegawai
        ? {
            id: pegawai.id,
            nama: pegawai.nama,
            nip: pegawai.nip,
            bidangId: pegawai.bidang.id,
            bidang: pegawai.bidang.nama,
            unitInduk: pegawai.bidang.parent?.nama ?? null,
          }
        : null,
    }));
    return { items, total };
  },

  /**
   * Satu akun berdasarkan id
   */
  async byId(id: string, db: Db = prisma) {
    const a = await db.user.findUnique({ where: { id }, select: PILIH_AKUN });
    return a ? ringkas(a) : undefined;
  },

  /**
   * Detail akun untuk halaman detail admin: data akun, pegawai beserta bidangnya, dan sesi yang masih berlaku
   */
  async detail(id: string, sekarang = new Date()) {
    const a = await prisma.user.findUnique({
      where: { id },
      select: {
        ...PILIH_AKUN,
        image: true,
        kontak: true,
        updatedAt: true,
        pegawai: {
          select: {
            id: true,
            nip: true,
            nama: true,
            aktif: true,
            bidang: { select: { id: true, nama: true, parent: { select: { id: true, nama: true } } } },
          },
        },
        sessions: {
          where: { expiresAt: { gt: sekarang } },
          select: { id: true, ipAddress: true, userAgent: true, createdAt: true, updatedAt: true, expiresAt: true },
          orderBy: { updatedAt: "desc" },
        },
      },
    });
    return a ? ringkas(a) : undefined;
  },

  /**
   * Membuat akun tanpa kata sandi (status MENUNGGU_AKTIVASI sampai pemiliknya mengaktifkan lewat email)
   */
  async insert(nilai: { id: string; name: string; email: string; role: Role; pegawaiId: number | null }, tx: Db) {
    await tx.user.create({ data: { ...nilai, emailVerified: false } });
  },

  /**
   * Mengubah kolom akun
   */
  async update(id: string, data: Prisma.UserUncheckedUpdateInput, tx: Db) {
    await tx.user.update({ where: { id }, data });
  },

  /**
   * Menghapus akun (sesi, kredensial, dan draf ikut terhapus lewat ON DELETE CASCADE)
   */
  async hapus(id: string, tx: Db) {
    await tx.user.delete({ where: { id } });
  },

  /**
   * Akun lain (selain kecualiUserId) yang sudah tertaut ke pegawai ini
   */
  async akunLainUntukPegawai(pegawaiId: number, kecualiUserId?: string) {
    return (
      (await prisma.user.findFirst({ where: { pegawaiId, id: kecualiUserId ? { not: kecualiUserId } : undefined }, select: { id: true, email: true } })) ??
      undefined
    );
  },

  /**
   * Pegawai pemilik NIP tertentu
   */
  async pegawaiByNip(nip: string) {
    return (await prisma.pegawai.findUnique({ where: { nip }, select: { id: true, nama: true, aktif: true } })) ?? undefined;
  },

  /**
   * Pegawai berdasarkan id
   */
  async pegawai(id: number) {
    return (await prisma.pegawai.findUnique({ where: { id }, select: { id: true, nip: true, bidangId: true, aktif: true } })) ?? undefined;
  },

  /**
   * Id akun yang meninggalkan data kegiatan (membuat kegiatan, mengunggah dokumentasi, atau memeriksa) sehingga tidak boleh dihapus.
   * Riwayat audit tidak ikut dihitung: audit_log menyimpan id aktor sebagai teks, jadi tetap utuh setelah akun dihapus
   */
  async terpakai(ids: string[]) {
    if (!ids.length) return new Set<string>();
    const [pembuat, pengunggah, pemeriksa] = await Promise.all([
      prisma.kegiatan.findMany({ where: { dibuatOleh: { in: ids } }, distinct: ["dibuatOleh"], select: { dibuatOleh: true } }),
      prisma.dokumentasi.findMany({ where: { diunggahOleh: { in: ids } }, distinct: ["diunggahOleh"], select: { diunggahOleh: true } }),
      prisma.catatanPemeriksaan.findMany({ where: { pemeriksaId: { in: ids } }, distinct: ["pemeriksaId"], select: { pemeriksaId: true } }),
    ]);
    return new Set([...pembuat.map((b) => b.dibuatOleh), ...pengunggah.map((b) => b.diunggahOleh), ...pemeriksa.map((b) => b.pemeriksaId)]);
  },
};
