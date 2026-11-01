import { prisma, type Prisma } from "@/lib/prisma";
import type { Milik, Rentang } from "@/types/umum.types";
import { angka } from "@/utils/status-kegiatan";
import { KEGIATAN_AKTIF, kondisiMilik, kondisiRentang, kondisiStatus, PILIH_RINGKAS, ratakanRingkas } from "./kegiatan.repository";

// Kegiatan yang belum punya berkas dokumentasi sama sekali
const TANPA_DOKUMENTASI = { dokumentasi: { none: {} } } satisfies Prisma.KegiatanWhereInput;

// Kegiatan aktif yang mulai di dalam rentang waktu
const dalamRentang = (rentang: Rentang): Prisma.KegiatanWhereInput => ({ ...KEGIATAN_AKTIF, ...kondisiRentang(rentang) });

// Daftar ringkas kegiatan untuk kartu dashboard (unit kerja ditampilkan sebagai nama saja)
async function daftarRingkas(where: Prisma.KegiatanWhereInput, orderBy: Prisma.KegiatanOrderByWithRelationInput, batas: number, sekarang: Date) {
  const baris = await prisma.kegiatan.findMany({ where, select: PILIH_RINGKAS, orderBy, take: batas });
  return baris.map((b) => {
    const k = ratakanRingkas(b, sekarang);
    return { ...k, unitKerja: k.unitKerja.nama };
  });
}

// Daftar ringkas plus jumlah totalnya (untuk kartu "x dari y")
async function daftarDenganTotal(where: Prisma.KegiatanWhereInput, orderBy: Prisma.KegiatanOrderByWithRelationInput, batas: number, sekarang: Date) {
  const [items, total] = await Promise.all([daftarRingkas(where, orderBy, batas, sekarang), prisma.kegiatan.count({ where })]);
  return { total, items };
}

export const DashboardRepository = {
  // Angka KPI bulan terpilih: total, berlangsung, akan datang, selesai tanpa dokumentasi
  async hitungKpi(rentang: Rentang, sekarang: Date) {
    const dasar = dalamRentang(rentang);
    const [total, berlangsung, akanDatang, selesaiTanpaDokumentasi] = await Promise.all([
      prisma.kegiatan.count({ where: dasar }),
      prisma.kegiatan.count({ where: { AND: [dasar, kondisiStatus("berlangsung", sekarang)] } }),
      prisma.kegiatan.count({ where: { AND: [dasar, kondisiStatus("akan_datang", sekarang)] } }),
      prisma.kegiatan.count({ where: { AND: [dasar, kondisiStatus("selesai", sekarang), TANPA_DOKUMENTASI] } }),
    ]);
    return { total, berlangsung, akanDatang, selesaiTanpaDokumentasi };
  },

  // Jumlah kegiatan aktif dalam rentang waktu
  hitungTotal(rentang: Rentang) {
    return prisma.kegiatan.count({ where: dalamRentang(rentang) });
  },

  // Jumlah kegiatan per bulan per unit induk, dibaca dari view v_rekap_bulanan
  jumlahPerBulanUnitInduk(bulanAwal: string, bulanAkhir: string) {
    return prisma.$queryRaw<{ bulan: string; unitIndukId: number; jumlah: number }[]>`
      SELECT bulan, unit_induk_id AS "unitIndukId", SUM(jumlah)::int AS jumlah
      FROM v_rekap_bulanan
      WHERE bulan BETWEEN ${bulanAwal} AND ${bulanAkhir}
      GROUP BY bulan, unit_induk_id`;
  },

  // Unit kerja tertinggi (tanpa induk) yang aktif
  daftarUnitInduk() {
    return prisma.unitKerja.findMany({
      where: { parentId: null, aktif: true },
      select: { id: true, kode: true, nama: true },
      orderBy: { id: "asc" },
    });
  },

  // Jumlah kegiatan per jenis dalam rentang waktu, terbanyak di atas
  async jumlahPerJenis(rentang: Rentang) {
    const [kelompok, jenis] = await Promise.all([
      prisma.kegiatan.groupBy({ by: ["jenisId"], where: dalamRentang(rentang), _count: { _all: true } }),
      prisma.jenisKegiatan.findMany({ select: { id: true, nama: true } }),
    ]);
    return kelompok
      .map((g) => ({ id: g.jenisId, nama: jenis.find((j) => j.id === g.jenisId)?.nama ?? "-", jumlah: g._count._all }))
      .sort((a, b) => b.jumlah - a.jumlah);
  },

  // Kegiatan berkoordinat dalam rentang waktu (untuk peta)
  async titikPeta(rentang: Rentang, sekarang: Date) {
    const baris = await prisma.kegiatan.findMany({
      where: { ...dalamRentang(rentang), lat: { not: null }, lng: { not: null } },
      select: { ...PILIH_RINGKAS, lat: true, lng: true },
    });
    return baris.map(({ lat, lng, ...b }) => {
      const k = ratakanRingkas(b, sekarang);
      return { ...k, unitKerja: k.unitKerja.nama, lat: angka(lat)!, lng: angka(lng)! };
    });
  },

  // Kegiatan selesai bulan ini yang belum berdokumentasi
  selesaiTanpaDokumentasi(rentang: Rentang, sekarang: Date, batas: number) {
    const where = { AND: [dalamRentang(rentang), kondisiStatus("selesai", sekarang), TANPA_DOKUMENTASI] };
    return daftarDenganTotal(where, { tglSelesai: "desc" }, batas, sekarang);
  },

  // Kegiatan terdekat yang akan datang
  akanDatang(sekarang: Date, batas: number) {
    return daftarRingkas({ AND: [KEGIATAN_AKTIF, kondisiStatus("akan_datang", sekarang)] }, { tglMulai: "asc" }, batas, sekarang);
  },

  // Kegiatan milik user yang sudah selesai tetapi belum berdokumentasi
  milikTanpaDokumentasi(milik: Milik, sekarang: Date, batas: number) {
    const where = { AND: [KEGIATAN_AKTIF, kondisiMilik(milik), kondisiStatus("selesai", sekarang), TANPA_DOKUMENTASI] };
    return daftarDenganTotal(where, { tglSelesai: "desc" }, batas, sekarang);
  },

  // Agenda milik user: kegiatan yang sedang berlangsung atau akan datang
  agendaMilik(milik: Milik, sekarang: Date, batas: number) {
    const where = {
      AND: [KEGIATAN_AKTIF, kondisiMilik(milik), { OR: [kondisiStatus("berlangsung", sekarang), kondisiStatus("akan_datang", sekarang)] }],
    };
    return daftarDenganTotal(where, { tglMulai: "asc" }, batas, sekarang);
  },
};
