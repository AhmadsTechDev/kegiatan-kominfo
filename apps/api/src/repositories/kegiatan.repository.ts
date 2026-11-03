import { prisma, type Db, type Prisma } from "@/lib/prisma";
import type { FilterDaftar, LingkupBaca, NilaiKegiatan } from "@/types/kegiatan.types";
import type { Halaman, Milik, Rentang, StatusPelaksanaan } from "@/types/umum.types";
import { angka, hitungStatus } from "@/utils/status-kegiatan";

// Kegiatan yang belum dihapus (soft delete)
export const KEGIATAN_AKTIF = { deletedAt: null } satisfies Prisma.KegiatanWhereInput;

// Kondisi kegiatan milik user: dibuat olehnya, atau dia penanggung jawabnya
export function kondisiMilik({ userId, pegawaiId }: Milik): Prisma.KegiatanWhereInput {
  return pegawaiId == null ? { dibuatOleh: userId } : { OR: [{ dibuatOleh: userId }, { penanggungJawabId: pegawaiId }] };
}

// Kondisi kegiatan yang boleh dilihat PEGAWAI: bidangnya, atau kegiatan miliknya
export function kondisiLingkup({ unitIds, milik }: LingkupBaca): Prisma.KegiatanWhereInput {
  return unitIds.length > 0 ? { OR: [{ bidangId: { in: unitIds } }, kondisiMilik(milik)] } : kondisiMilik(milik);
}

// Kondisi status pelaksanaan (dihitung dari waktu sekarang, tidak disimpan di tabel)
export function kondisiStatus(status: StatusPelaksanaan, sekarang: Date): Prisma.KegiatanWhereInput {
  switch (status) {
    case "dibatalkan":
      return { dibatalkanAt: { not: null } };
    case "akan_datang":
      return { dibatalkanAt: null, tglMulai: { gt: sekarang } };
    case "berlangsung":
      return { dibatalkanAt: null, tglMulai: { lte: sekarang }, tglSelesai: { gte: sekarang } };
    case "selesai":
      return { dibatalkanAt: null, tglSelesai: { lt: sekarang } };
  }
}

// Kondisi kegiatan yang mulai di dalam rentang waktu
export const kondisiRentang = ({ mulai, akhir }: Rentang): Prisma.KegiatanWhereInput => ({ tglMulai: { gte: mulai, lt: akhir } });

// Menyusun `where` Prisma dari filter daftar kegiatan (dipakai juga oleh rekap, pantau, ekspor)
export function kondisiDaftar(f: FilterDaftar, sekarang: Date): Prisma.KegiatanWhereInput {
  const syarat: Prisma.KegiatanWhereInput[] = [KEGIATAN_AKTIF];
  if (f.unitIds) syarat.push({ bidangId: { in: f.unitIds } });
  if (f.jenisId) syarat.push({ jenisId: f.jenisId });
  if (f.pegawaiId) syarat.push({ penanggungJawabId: f.pegawaiId });
  if (f.status) syarat.push(kondisiStatus(f.status, sekarang));
  if (f.pemeriksaan) syarat.push({ statusPemeriksaan: f.pemeriksaan });
  if (f.rentang) syarat.push(kondisiRentang(f.rentang));
  if (f.q) {
    const cari = { contains: f.q, mode: "insensitive" } as const;
    // Nama penanggung jawab ikut dicari agar pimpinan bisa mengetik nama pegawai di kolom cari
    syarat.push({ OR: [{ judul: cari }, { lokasiNama: cari }, { uraian: cari }, { penanggungJawab: { nama: cari } }] });
  }
  if (f.milik) syarat.push(kondisiMilik(f.milik));
  if (f.lingkup) syarat.push(kondisiLingkup(f.lingkup));
  return { AND: syarat };
}

// Kolom ringkas kegiatan untuk kalender dan dashboard
export const PILIH_RINGKAS = {
  id: true,
  judul: true,
  tglMulai: true,
  tglSelesai: true,
  lokasiNama: true,
  dibatalkanAt: true,
  bidang: { select: { id: true, nama: true } },
  jenis: { select: { nama: true } },
  penanggungJawab: { select: { nama: true } },
} satisfies Prisma.KegiatanSelect;

type BarisRingkas = Prisma.KegiatanGetPayload<{ select: typeof PILIH_RINGKAS }>;

// Meratakan baris ringkas: nama jenis & penanggung jawab jadi teks, plus status pelaksanaan
export function ratakanRingkas({ dibatalkanAt, jenis, penanggungJawab, ...k }: BarisRingkas, sekarang: Date) {
  return {
    ...k,
    jenis: jenis.nama,
    penanggungJawab: penanggungJawab.nama,
    statusPelaksanaan: hitungStatus({ dibatalkanAt, tglMulai: k.tglMulai, tglSelesai: k.tglSelesai }, sekarang),
  };
}

export const KegiatanRepository = {
  // Daftar kegiatan sesuai filter dengan paginasi, beserta jumlah totalnya
  async daftar(f: FilterDaftar, sekarang: Date, halaman: Halaman) {
    const where = kondisiDaftar(f, sekarang);
    const [baris, total] = await Promise.all([
      prisma.kegiatan.findMany({
        where,
        select: {
          id: true,
          judul: true,
          tglMulai: true,
          tglSelesai: true,
          lokasiNama: true,
          dibatalkanAt: true,
          bidang: { select: { id: true, nama: true } },
          jenis: { select: { id: true, nama: true } },
          penanggungJawab: { select: { id: true, nama: true } },
          dibuatOleh: true,
          statusPemeriksaan: true,
          updatedAt: true,
        },
        orderBy: [{ tglMulai: "desc" }, { id: "desc" }],
        take: halaman.pageSize,
        skip: (halaman.page - 1) * halaman.pageSize,
      }),
      prisma.kegiatan.count({ where }),
    ]);
    const items = baris.map(({ dibatalkanAt, ...k }) => ({ ...k, statusPelaksanaan: hitungStatus({ dibatalkanAt, ...k }, sekarang) }));
    return { items, total };
  },

  // Kegiatan yang beririsan dengan rentang waktu (untuk kalender), maksimal `batas` baris
  async kalender(rentang: Rentang, lingkup: LingkupBaca | undefined, sekarang: Date, batas: number) {
    const baris = await prisma.kegiatan.findMany({
      where: {
        AND: [KEGIATAN_AKTIF, { tglMulai: { lt: rentang.akhir }, tglSelesai: { gte: rentang.mulai } }, lingkup ? kondisiLingkup(lingkup) : {}],
      },
      select: PILIH_RINGKAS,
      orderBy: [{ tglMulai: "asc" }, { id: "asc" }],
      take: batas,
    });
    return baris.map((k) => ratakanRingkas(k, sekarang));
  },

  // Detail satu kegiatan aktif beserta jenis, unit (dan induknya), penanggung jawab, dan pembuat
  async detail(id: number, sekarang: Date) {
    const k = await prisma.kegiatan.findFirst({
      where: { id, ...KEGIATAN_AKTIF },
      select: {
        id: true,
        judul: true,
        uraian: true,
        hasil: true,
        tglMulai: true,
        tglSelesai: true,
        lokasiNama: true,
        lat: true,
        lng: true,
        jumlahPeserta: true,
        refEksternal: true,
        dibatalkanAt: true,
        alasanBatal: true,
        jenis: { select: { id: true, nama: true } },
        bidang: { select: { id: true, nama: true, parent: { select: { id: true, nama: true } } } },
        penanggungJawab: { select: { id: true, nama: true } },
        pembuat: { select: { id: true, name: true } },
        statusPemeriksaan: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!k) return undefined;
    const { bidang, pembuat, ...sisa } = k;
    return {
      ...sisa,
      lat: angka(k.lat),
      lng: angka(k.lng),
      bidang: { id: bidang.id, nama: bidang.nama },
      unitInduk: bidang.parent,
      pembuat: { id: pembuat.id, nama: pembuat.name },
      statusPelaksanaan: hitungStatus(k, sekarang),
    };
  },

  // Daftar berkas dokumentasi sebuah kegiatan
  daftarDokumentasi(kegiatanId: number) {
    return prisma.dokumentasi.findMany({
      where: { kegiatanId },
      select: { id: true, namaAsli: true, mime: true, ukuran: true, createdAt: true },
      orderBy: { id: "asc" },
    });
  },

  // Riwayat catatan pemeriksaan pimpinan, terbaru di atas
  async daftarCatatan(kegiatanId: number) {
    const baris = await prisma.catatanPemeriksaan.findMany({
      where: { kegiatanId },
      select: { id: true, status: true, isi: true, createdAt: true, pemeriksa: { select: { name: true } } },
      orderBy: { id: "desc" },
    });
    return baris.map((c) => ({ id: c.id, status: c.status, isi: c.isi, pemeriksa: c.pemeriksa.name, waktu: c.createdAt }));
  },

  // Mengubah status pemeriksaan tanpa menaikkan versi (updatedAt diisi nilai lama)
  async setPemeriksaan(id: number, status: string, versi: Date, tx: Db) {
    await tx.kegiatan.update({ where: { id }, data: { statusPemeriksaan: status, updatedAt: versi } });
  },

  // Menyimpan satu catatan pemeriksaan
  async insertCatatan(nilai: { kegiatanId: number; pemeriksaId: string; status: string; isi: string | null }, tx: Db) {
    await tx.catatanPemeriksaan.create({ data: nilai });
  },

  // Mengunci baris kegiatan aktif (SELECT ... FOR UPDATE) lalu mengambil isinya; harus di dalam transaksi
  async kunciAktif(id: number, tx: Db) {
    const terkunci = await tx.$queryRaw<{ id: number }[]>`SELECT id FROM kegiatan WHERE id = ${id} AND deleted_at IS NULL FOR UPDATE`;
    if (!terkunci.length) return undefined;
    return (await tx.kegiatan.findUnique({ where: { id } })) ?? undefined;
  },

  // Menyimpan kegiatan baru dan mengembalikan id-nya
  async insert(nilai: NilaiKegiatan & { dibuatOleh: string }, tx: Db) {
    const baru = await tx.kegiatan.create({ data: nilai, select: { id: true } });
    return baru.id;
  },

  // Mengubah kegiatan hanya bila versinya (updatedAt) masih sama; mengembalikan jumlah baris yang berubah
  async updateDenganVersi(id: number, versi: Date, nilai: Prisma.KegiatanUncheckedUpdateManyInput, tx: Db) {
    const hasil = await tx.kegiatan.updateMany({ where: { id, updatedAt: versi, ...KEGIATAN_AKTIF }, data: nilai });
    return hasil.count;
  },

  // Menghapus kegiatan secara lunak (mengisi deletedAt)
  async softDelete(id: number, tx: Db) {
    await tx.kegiatan.updateMany({ where: { id, ...KEGIATAN_AKTIF }, data: { deletedAt: new Date() } });
  },

  // Baris kegiatan lengkap untuk berkas ekspor PDF
  async untukEkspor(f: FilterDaftar, sekarang: Date, batas: number) {
    const baris = await prisma.kegiatan.findMany({
      where: kondisiDaftar(f, sekarang),
      select: {
        id: true,
        judul: true,
        jenis: { select: { nama: true } },
        bidang: { select: { nama: true } },
        bidangId: true,
        penanggungJawab: { select: { nama: true } },
        tglMulai: true,
        tglSelesai: true,
        lokasiNama: true,
        lat: true,
        lng: true,
        jumlahPeserta: true,
        uraian: true,
        hasil: true,
        alasanBatal: true,
        refEksternal: true,
        dibatalkanAt: true,
      },
      orderBy: [{ tglMulai: "desc" }, { id: "desc" }],
      take: batas,
    });
    return baris.map(({ jenis, bidang, penanggungJawab, dibatalkanAt, ...k }) => ({
      ...k,
      jenis: jenis.nama,
      bidang: bidang.nama,
      penanggungJawab: penanggungJawab.nama,
      lat: angka(k.lat),
      lng: angka(k.lng),
      statusPelaksanaan: hitungStatus({ dibatalkanAt, ...k }, sekarang),
    }));
  },

  // Mengambil satu baris kegiatan apa adanya (untuk data audit sebelum/sesudah)
  async findById(id: number, tx: Db = prisma) {
    return (await tx.kegiatan.findUnique({ where: { id } })) ?? undefined;
  },
};
