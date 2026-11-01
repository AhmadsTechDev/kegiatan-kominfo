import { prisma, type Db, type Prisma } from "@/lib/prisma";
import type { FilterPegawai, NilaiJenis, NilaiJenisUnit, NilaiPegawai, NilaiUnit } from "@/types/master.types";
import type { Halaman } from "@/types/umum.types";

// Menyusun `where` Prisma dari filter daftar pegawai
function kondisiPegawai(f: FilterPegawai): Prisma.PegawaiWhereInput {
  const cari = f.q ? ({ contains: f.q, mode: "insensitive" } as const) : undefined;
  return {
    OR: cari ? [{ nama: cari }, { nip: cari }, { jabatan: cari }] : undefined,
    unitKerjaId: f.unitIds ? { in: f.unitIds } : undefined,
    aktif: f.aktif,
  };
}

export const MasterRepository = {
  // ---------- Unit kerja ----------

  // Semua unit kerja beserta nama jenis dan nama unit induknya
  async daftarUnit() {
    const baris = await prisma.unitKerja.findMany({
      select: {
        id: true,
        kode: true,
        nama: true,
        jenisUnitId: true,
        jenisUnit: { select: { nama: true } },
        parentId: true,
        parent: { select: { nama: true } },
        aktif: true,
        updatedAt: true,
      },
      orderBy: { id: "asc" },
    });
    return baris.map(({ jenisUnit, parent, ...u }) => ({ ...u, jenis: jenisUnit.nama, induk: parent?.nama ?? null }));
  },

  // Jumlah pegawai aktif di setiap unit kerja
  async jumlahPegawaiPerUnit() {
    const baris = await prisma.pegawai.groupBy({ by: ["unitKerjaId"], where: { aktif: true }, _count: { _all: true } });
    return baris.map((b) => ({ unitKerjaId: b.unitKerjaId, jumlah: b._count._all }));
  },

  // Satu unit kerja berdasarkan id
  async unitById(id: number, db: Db = prisma) {
    return (await db.unitKerja.findUnique({ where: { id } })) ?? undefined;
  },

  // Jumlah unit turunan yang masih aktif
  jumlahTurunanAktif(id: number) {
    return prisma.unitKerja.count({ where: { parentId: id, aktif: true } });
  },

  // Jumlah pegawai aktif di sebuah unit
  jumlahPegawaiAktif(unitId: number) {
    return prisma.pegawai.count({ where: { unitKerjaId: unitId, aktif: true } });
  },

  // Kode unit yang diawali teks tertentu (untuk membuat kode unik otomatis)
  async kodeUnitBerawalan(awalan: string) {
    const baris = await prisma.unitKerja.findMany({ where: { kode: { startsWith: awalan } }, select: { kode: true } });
    return new Set(baris.map((b) => b.kode));
  },

  // Menyimpan unit kerja baru dan mengembalikan id-nya
  async insertUnit(nilai: NilaiUnit, tx: Db) {
    return (await tx.unitKerja.create({ data: nilai, select: { id: true } })).id;
  },

  // Mengubah unit kerja
  async updateUnit(id: number, nilai: Partial<NilaiUnit>, tx: Db) {
    await tx.unitKerja.update({ where: { id }, data: nilai });
  },

  // ---------- Jenis unit ----------

  // Semua jenis unit, urut id
  daftarJenisUnit() {
    return prisma.jenisUnit.findMany({
      select: { id: true, nama: true, indukJenisId: true, aktif: true, updatedAt: true },
      orderBy: { id: "asc" },
    });
  },

  // Jumlah unit (semua dan yang aktif) untuk setiap jenis unit
  async jumlahUnitPerJenis() {
    const baris = await prisma.unitKerja.groupBy({ by: ["jenisUnitId", "aktif"], _count: { _all: true } });
    const peta = new Map<number, { jenisUnitId: number; jumlah: number; aktif: number }>();
    for (const b of baris) {
      const j = peta.get(b.jenisUnitId) ?? { jenisUnitId: b.jenisUnitId, jumlah: 0, aktif: 0 };
      j.jumlah += b._count._all;
      if (b.aktif) j.aktif += b._count._all;
      peta.set(b.jenisUnitId, j);
    }
    return [...peta.values()];
  },

  // Satu jenis unit berdasarkan id
  async jenisUnitById(id: number, db: Db = prisma) {
    return (await db.jenisUnit.findUnique({ where: { id } })) ?? undefined;
  },

  // Jumlah unit aktif yang memakai jenis ini
  jumlahUnitAktifBerjenis(jenisUnitId: number) {
    return prisma.unitKerja.count({ where: { jenisUnitId, aktif: true } });
  },

  // Jumlah jenis unit aktif yang menjadikan jenis ini sebagai induknya
  jumlahJenisTurunanAktif(id: number) {
    return prisma.jenisUnit.count({ where: { indukJenisId: id, aktif: true } });
  },

  // Menyimpan jenis unit baru dan mengembalikan id-nya
  async insertJenisUnit(nilai: NilaiJenisUnit, tx: Db) {
    return (await tx.jenisUnit.create({ data: nilai, select: { id: true } })).id;
  },

  // Mengubah jenis unit
  async updateJenisUnit(id: number, nilai: Partial<NilaiJenisUnit>, tx: Db) {
    await tx.jenisUnit.update({ where: { id }, data: nilai });
  },

  // ---------- Pegawai ----------

  // Daftar pegawai dengan filter dan paginasi, beserta unit kerja dan akun loginnya (bila ada)
  async daftarPegawai(f: FilterPegawai, halaman: Halaman) {
    const where = kondisiPegawai(f);
    const [baris, total] = await Promise.all([
      prisma.pegawai.findMany({
        where,
        select: {
          id: true,
          nip: true,
          nama: true,
          jabatan: true,
          unitKerja: { select: { id: true, nama: true } },
          aktif: true,
          users: { select: { id: true, email: true, accounts: { where: { providerId: "credential" }, select: { id: true } } }, take: 1 },
          updatedAt: true,
        },
        orderBy: [{ nama: "asc" }, { id: "asc" }],
        take: halaman.pageSize,
        skip: (halaman.page - 1) * halaman.pageSize,
      }),
      prisma.pegawai.count({ where }),
    ]);
    const items = baris.map(({ users, ...p }) => {
      const akun = users[0];
      return { ...p, akun: akun ? { id: akun.id, email: akun.email, aktif: akun.accounts.length > 0 } : null };
    });
    return { items, total };
  },

  // Satu pegawai berdasarkan id
  async pegawaiById(id: number, db: Db = prisma) {
    return (await db.pegawai.findUnique({ where: { id } })) ?? undefined;
  },

  // Menyimpan pegawai baru dan mengembalikan id-nya
  async insertPegawai(nilai: NilaiPegawai, tx: Db) {
    return (await tx.pegawai.create({ data: nilai, select: { id: true } })).id;
  },

  // Mengubah data pegawai
  async updatePegawai(id: number, nilai: Partial<NilaiPegawai>, tx: Db) {
    await tx.pegawai.update({ where: { id }, data: nilai });
  },

  // Pegawai yang NIP-nya ada di daftar (untuk impor Excel)
  pegawaiByNips(nips: string[]) {
    if (!nips.length) return Promise.resolve([]);
    return prisma.pegawai.findMany({ where: { nip: { in: nips } } });
  },

  // Pegawai pemilik NIP tertentu
  async pegawaiDenganNip(nip: string) {
    return (await prisma.pegawai.findUnique({ where: { nip }, select: { id: true, nama: true } })) ?? undefined;
  },

  // Akun yang memakai username (NIP) tertentu
  async akunDenganUsername(username: string) {
    return (await prisma.user.findUnique({ where: { username }, select: { id: true, email: true, pegawaiId: true } })) ?? undefined;
  },

  // Akun yang memakai email tertentu
  async akunDenganEmail(email: string) {
    return (await prisma.user.findUnique({ where: { email }, select: { id: true, name: true } })) ?? undefined;
  },

  // Semua pegawai tanpa NIP (dicocokkan lewat nama saat impor)
  pegawaiTanpaNip() {
    return prisma.pegawai.findMany({ where: { nip: null } });
  },

  // Menyamakan username (NIP) akun dengan NIP pegawai yang baru diubah
  async samakanNipAkun(pegawaiId: number, nip: string | null, tx: Db) {
    await tx.user.updateMany({ where: { pegawaiId }, data: { username: nip, displayUsername: nip } });
  },

  // ---------- Jenis kegiatan ----------

  // Semua jenis kegiatan, urut nama
  daftarJenis() {
    return prisma.jenisKegiatan.findMany({ select: { id: true, nama: true, aktif: true, updatedAt: true }, orderBy: { nama: "asc" } });
  },

  // Jumlah kegiatan (termasuk yang dihapus) untuk setiap jenis
  async jumlahKegiatanPerJenis() {
    const baris = await prisma.kegiatan.groupBy({ by: ["jenisId"], _count: { _all: true } });
    return baris.map((b) => ({ jenisId: b.jenisId, jumlah: b._count._all }));
  },

  // Satu jenis kegiatan berdasarkan id
  async jenisById(id: number, db: Db = prisma) {
    return (await db.jenisKegiatan.findUnique({ where: { id } })) ?? undefined;
  },

  // Menyimpan jenis kegiatan baru dan mengembalikan id-nya
  async insertJenis(nilai: NilaiJenis, tx: Db) {
    return (await tx.jenisKegiatan.create({ data: nilai, select: { id: true } })).id;
  },

  // Mengubah jenis kegiatan
  async updateJenis(id: number, nilai: Partial<NilaiJenis>, tx: Db) {
    await tx.jenisKegiatan.update({ where: { id }, data: nilai });
  },
};
