import { prisma, type Db, type Prisma } from "@/lib/prisma";
import type { FilterPegawai, NilaiJenis, NilaiPegawai, NilaiUnit } from "@/types/master.types";
import type { Halaman } from "@/types/umum.types";

// Menyusun `where` Prisma dari filter daftar pegawai
function kondisiPegawai(f: FilterPegawai): Prisma.PegawaiWhereInput {
  const cari = f.q ? ({ contains: f.q, mode: "insensitive" } as const) : undefined;
  return {
    OR: cari ? [{ nama: cari }, { nip: cari }, { jabatan: cari }] : undefined,
    bidangId: f.unitIds ? { in: f.unitIds } : undefined,
    aktif: f.aktif,
    users: f.tanpaAkun ? { none: {} } : undefined,
  };
}

export const MasterRepository = {
  // ---------- Bidang ----------

  // Semua bidang dan sub bidang beserta nama induknya. Tingkat (jenis) ditentukan ada-tidaknya induk
  async daftarUnit() {
    const baris = await prisma.bidang.findMany({
      select: {
        id: true,
        kode: true,
        nama: true,
        parentId: true,
        parent: { select: { nama: true } },
        aktif: true,
        updatedAt: true,
      },
      orderBy: { id: "asc" },
    });
    return baris.map(({ parent, ...u }) => ({ ...u, jenis: u.parentId === null ? "Bidang" : "Sub bidang", induk: parent?.nama ?? null }));
  },

  // Jumlah pegawai aktif di setiap bidang
  async jumlahPegawaiPerUnit() {
    const baris = await prisma.pegawai.groupBy({ by: ["bidangId"], where: { aktif: true }, _count: { _all: true } });
    return baris.map((b) => ({ bidangId: b.bidangId, jumlah: b._count._all }));
  },

  // Satu bidang berdasarkan id
  async unitById(id: number, db: Db = prisma) {
    return (await db.bidang.findUnique({ where: { id } })) ?? undefined;
  },

  // Jumlah sub bidang di bawah sebuah bidang (semua) dan yang masih aktif
  jumlahTurunan(id: number) {
    return prisma.bidang.count({ where: { parentId: id } });
  },

  jumlahTurunanAktif(id: number) {
    return prisma.bidang.count({ where: { parentId: id, aktif: true } });
  },

  // Pemakaian sebuah bidang: semua pegawai (aktif atau tidak), semua kegiatan (termasuk yang dihapus lunak, karena
  // kunci asingnya tetap menahan), dan sub bidangnya. Bidang yang ketiganya nol boleh dihapus
  async pemakaian(ids: number[]) {
    const [pegawai, kegiatan, turunan] = await Promise.all([
      prisma.pegawai.groupBy({ by: ["bidangId"], where: { bidangId: { in: ids } }, _count: { _all: true } }),
      prisma.kegiatan.groupBy({ by: ["bidangId"], where: { bidangId: { in: ids } }, _count: { _all: true } }),
      prisma.bidang.groupBy({ by: ["parentId"], where: { parentId: { in: ids } }, _count: { _all: true } }),
    ]);
    const peta = new Map<number, { pegawai: number; kegiatan: number; turunan: number }>(ids.map((id) => [id, { pegawai: 0, kegiatan: 0, turunan: 0 }]));
    for (const b of pegawai) peta.get(b.bidangId)!.pegawai = b._count._all;
    for (const b of kegiatan) peta.get(b.bidangId)!.kegiatan = b._count._all;
    for (const b of turunan) if (b.parentId !== null) peta.get(b.parentId)!.turunan = b._count._all;
    return peta;
  },

  // Menghapus bidang secara permanen (hanya dipanggil setelah dicek tidak dipakai)
  async hapusUnit(id: number, tx: Db) {
    await tx.bidang.delete({ where: { id } });
  },

  // Jumlah pegawai aktif di sebuah unit
  jumlahPegawaiAktif(unitId: number) {
    return prisma.pegawai.count({ where: { bidangId: unitId, aktif: true } });
  },

  // Kode unit yang diawali teks tertentu (untuk membuat kode unik otomatis)
  async kodeUnitBerawalan(awalan: string) {
    const baris = await prisma.bidang.findMany({ where: { kode: { startsWith: awalan } }, select: { kode: true } });
    return new Set(baris.map((b) => b.kode));
  },

  // Menyimpan bidang baru dan mengembalikan id-nya
  async insertUnit(nilai: NilaiUnit, tx: Db) {
    return (await tx.bidang.create({ data: nilai, select: { id: true } })).id;
  },

  // Mengubah bidang
  async updateUnit(id: number, nilai: Partial<NilaiUnit>, tx: Db) {
    await tx.bidang.update({ where: { id }, data: nilai });
  },

  // ---------- Pegawai ----------

  // Daftar pegawai dengan filter dan paginasi, beserta bidang dan akun loginnya (bila ada)
  async daftarPegawai(f: FilterPegawai, halaman: Halaman) {
    const where = kondisiPegawai(f);
    const pilih = {
      id: true,
      nip: true,
      nama: true,
      jabatan: true,
      bidang: { select: { id: true, nama: true } },
      aktif: true,
      users: { select: { id: true, email: true, kontak: true, accounts: { where: { providerId: "credential" }, select: { id: true } } }, take: 1 },
      updatedAt: true,
    } satisfies Prisma.PegawaiSelect;
    const urut = [{ nama: "asc" }, { id: "asc" }] satisfies Prisma.PegawaiOrderByWithRelationInput[];

    // Pegawai yang punya nomor telepon (kontak akun) tampil lebih dulu, tiap kelompok urut nama.
    // Kedua kelompok dipaginasi sebagai satu daftar
    const adaTelp: Prisma.PegawaiWhereInput = { users: { some: { kontak: { not: null } } } };
    const kelompok: Prisma.PegawaiWhereInput[] = [adaTelp, { NOT: adaTelp }];
    const jumlah = await Promise.all(kelompok.map((k) => prisma.pegawai.count({ where: { AND: [where, k] } })));
    const total = jumlah[0]! + jumlah[1]!;
    const awal = (halaman.page - 1) * halaman.pageSize;
    const akhir = awal + halaman.pageSize;

    const baris: Prisma.PegawaiGetPayload<{ select: typeof pilih }>[] = [];
    let mulai = 0;
    for (const [n, k] of kelompok.entries()) {
      const batas = mulai + jumlah[n]!;
      const dari = Math.max(awal, mulai);
      const sampai = Math.min(akhir, batas);
      if (sampai > dari) baris.push(...(await prisma.pegawai.findMany({ where: { AND: [where, k] }, select: pilih, orderBy: urut, skip: dari - mulai, take: sampai - dari })));
      mulai = batas;
    }
    const items = baris.map(({ users, ...p }) => {
      const akun = users[0];
      return { ...p, kontak: akun?.kontak ?? null, akun: akun ? { id: akun.id, email: akun.email, aktif: akun.accounts.length > 0 } : null };
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

  // Pegawai pemilik NIP tertentu
  async pegawaiDenganNip(nip: string) {
    return (await prisma.pegawai.findUnique({ where: { nip }, select: { id: true, nama: true } })) ?? undefined;
  },

  // Akun yang memakai email tertentu
  async akunDenganEmail(email: string) {
    return (await prisma.user.findUnique({ where: { email }, select: { id: true, name: true } })) ?? undefined;
  },

  // Menyamakan nama akun dengan nama pegawai yang baru diubah
  async samakanNamaAkun(pegawaiId: number, nama: string, tx: Db) {
    await tx.user.updateMany({ where: { pegawaiId }, data: { name: nama } });
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
