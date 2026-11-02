import { prisma, type Db, type Prisma } from "@/lib/prisma";
import type { Halaman, Role } from "@/types/umum.types";
import type { FilterAkun } from "@/types/user.types";
import { kondisiStatus } from "@/utils/status-akun";
import { AuditLogRepository } from "./audit-log.repository";

const KREDENSIAL = { where: { providerId: "credential" }, select: { id: true } } as const;

// Kolom akun yang ditampilkan dan dicatat di audit log
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

// Mengganti daftar akun kredensial dengan penanda punyaKredensial
function ringkas<T extends { accounts: unknown[] }>({ accounts, ...a }: T) {
  return { ...a, punyaKredensial: accounts.length > 0 };
}

// Menyusun `where` Prisma dari filter daftar akun
function kondisi(f: FilterAkun): Prisma.UserWhereInput {
  const cari = f.q ? ({ contains: f.q, mode: "insensitive" } as const) : undefined;
  return {
    AND: [
      cari ? { OR: [{ name: cari }, { email: cari }, { pegawai: { nip: { contains: f.q } } }] } : {},
      f.status ? kondisiStatus(f.status) : {},
    ],
    role: f.role,
  };
}

export const UserRepository = {
  // Daftar akun dengan filter dan paginasi, beserta pegawai tertaut dan status kredensialnya
  async daftar(f: FilterAkun, halaman: Halaman) {
    const where = kondisi(f);
    const [baris, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          ...PILIH_AKUN,
          image: true,
          pegawai: {
            select: {
              id: true,
              nama: true,
              nip: true,
              jabatan: true,
              unitKerja: { select: { id: true, nama: true, parent: { select: { nama: true } } } },
            },
          },
        },
        orderBy: [{ name: "asc" }, { id: "asc" }],
        take: halaman.pageSize,
        skip: (halaman.page - 1) * halaman.pageSize,
      }),
      prisma.user.count({ where }),
    ]);
    const items = baris.map(({ pegawai, ...a }) => ({
      ...ringkas(a),
      pegawai: pegawai
        ? {
            id: pegawai.id,
            nama: pegawai.nama,
            nip: pegawai.nip,
            jabatan: pegawai.jabatan,
            unitKerjaId: pegawai.unitKerja.id,
            unitKerja: pegawai.unitKerja.nama,
            unitInduk: pegawai.unitKerja.parent?.nama ?? null,
          }
        : null,
    }));
    return { items, total };
  },

  // Satu akun berdasarkan id
  async byId(id: string, db: Db = prisma) {
    const a = await db.user.findUnique({ where: { id }, select: PILIH_AKUN });
    return a ? ringkas(a) : undefined;
  },

  // Detail akun untuk halaman detail admin: data akun, pegawai beserta unit kerjanya, dan sesi yang masih berlaku
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
            jabatan: true,
            aktif: true,
            unitKerja: { select: { id: true, nama: true, parent: { select: { id: true, nama: true } } } },
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

  // Membuat akun tanpa kata sandi (status MENUNGGU_AKTIVASI sampai pemiliknya mengaktifkan lewat email)
  async insert(nilai: { id: string; name: string; email: string; role: Role; pegawaiId: number | null }, tx: Db) {
    await tx.user.create({ data: { ...nilai, emailVerified: false } });
  },

  // Mengubah kolom akun
  async update(id: string, data: Prisma.UserUncheckedUpdateInput, tx: Db) {
    await tx.user.update({ where: { id }, data });
  },

  // Menghapus akun (sesi, kredensial, dan draf ikut terhapus lewat ON DELETE CASCADE)
  async hapus(id: string, tx: Db) {
    await tx.user.delete({ where: { id } });
  },

  // Akun lain (selain kecualiUserId) yang sudah tertaut ke pegawai ini
  async akunLainUntukPegawai(pegawaiId: number, kecualiUserId?: string) {
    return (
      (await prisma.user.findFirst({ where: { pegawaiId, id: kecualiUserId ? { not: kecualiUserId } : undefined }, select: { id: true, email: true } })) ??
      undefined
    );
  },

  // Pegawai pemilik NIP tertentu
  async pegawaiByNip(nip: string) {
    return (await prisma.pegawai.findUnique({ where: { nip }, select: { id: true, nama: true, aktif: true } })) ?? undefined;
  },

  // Pegawai berdasarkan id
  async pegawai(id: number) {
    return (await prisma.pegawai.findUnique({ where: { id }, select: { id: true, nip: true, unitKerjaId: true, aktif: true } })) ?? undefined;
  },

  // Id akun yang sudah pernah dipakai (beraksi, membuat kegiatan, atau mengunggah) sehingga tidak boleh dihapus
  async terpakai(ids: string[]) {
    if (!ids.length) return new Set<string>();
    const [aksi, pembuat, pengunggah] = await Promise.all([
      AuditLogRepository.aktorPernahBeraksi(ids),
      prisma.kegiatan.findMany({ where: { dibuatOleh: { in: ids } }, distinct: ["dibuatOleh"], select: { dibuatOleh: true } }),
      prisma.dokumentasi.findMany({ where: { diunggahOleh: { in: ids } }, distinct: ["diunggahOleh"], select: { diunggahOleh: true } }),
    ]);
    return new Set([...aksi, ...pembuat.map((b) => b.dibuatOleh), ...pengunggah.map((b) => b.diunggahOleh)]);
  },
};
