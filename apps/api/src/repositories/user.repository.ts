import { prisma, type Prisma } from "@/lib/prisma";
import type { Halaman } from "@/types/umum.types";
import type { FilterAkun } from "@/types/user.types";
import { AuditLogRepository } from "./audit-log.repository";

// Kolom akun yang ditampilkan dan dicatat di audit log
const PILIH_AKUN = {
  id: true,
  name: true,
  email: true,
  username: true,
  role: true,
  banned: true,
  banReason: true,
  pegawaiId: true,
  lockedUntil: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

// Menyusun `where` Prisma dari filter daftar akun
function kondisi(f: FilterAkun): Prisma.UserWhereInput {
  const cari = f.q ? ({ contains: f.q, mode: "insensitive" } as const) : undefined;
  return {
    OR: cari ? [{ name: cari }, { email: cari }, { username: cari }] : undefined,
    role: f.role,
    banned: f.aktif === undefined ? undefined : !f.aktif,
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
          accounts: { where: { providerId: "credential" }, select: { id: true } },
          pegawai: {
            select: {
              id: true,
              nama: true,
              nip: true,
              jabatan: true,
              unitKerja: { select: { nama: true, parent: { select: { nama: true } } } },
            },
          },
        },
        orderBy: [{ name: "asc" }, { id: "asc" }],
        take: halaman.pageSize,
        skip: (halaman.page - 1) * halaman.pageSize,
      }),
      prisma.user.count({ where }),
    ]);
    const items = baris.map(({ accounts, pegawai, ...a }) => ({
      ...a,
      punyaKredensial: accounts.length > 0,
      pegawai: pegawai
        ? {
            id: pegawai.id,
            nama: pegawai.nama,
            nip: pegawai.nip,
            jabatan: pegawai.jabatan,
            unitKerja: pegawai.unitKerja.nama,
            unitInduk: pegawai.unitKerja.parent?.nama ?? null,
          }
        : null,
    }));
    return { items, total };
  },

  // Satu akun berdasarkan id
  async byId(id: string) {
    return (await prisma.user.findUnique({ where: { id }, select: PILIH_AKUN })) ?? undefined;
  },

  // Akun lain (selain kecualiUserId) yang sudah tertaut ke pegawai ini
  async akunLainUntukPegawai(pegawaiId: number, kecualiUserId?: string) {
    return (
      (await prisma.user.findFirst({ where: { pegawaiId, id: kecualiUserId ? { not: kecualiUserId } : undefined }, select: { id: true, email: true } })) ??
      undefined
    );
  },

  // Akun lain (selain kecualiUserId) yang sudah memakai username/NIP ini
  async akunLainDenganUsername(username: string, kecualiUserId?: string) {
    return (await prisma.user.findFirst({ where: { username, id: kecualiUserId ? { not: kecualiUserId } : undefined }, select: { id: true } })) ?? undefined;
  },

  // Pegawai pemilik NIP tertentu
  async pegawaiByNip(nip: string) {
    return (await prisma.pegawai.findUnique({ where: { nip }, select: { id: true, nama: true } })) ?? undefined;
  },

  // Pegawai aktif berdasarkan id
  async pegawaiAktif(id: number) {
    return (await prisma.pegawai.findFirst({ where: { id, aktif: true }, select: { id: true, nip: true } })) ?? undefined;
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
