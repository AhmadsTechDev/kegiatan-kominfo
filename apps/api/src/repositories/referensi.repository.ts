import { prisma } from "@/lib/prisma";

export const ReferensiRepository = {
  // Semua unit kerja (aktif maupun tidak), urut id
  semuaUnitKerja() {
    return prisma.unitKerja.findMany({
      select: { id: true, parentId: true, kode: true, nama: true, aktif: true },
      orderBy: { id: "asc" },
    });
  },

  // Jenis kegiatan yang masih aktif, urut nama
  jenisKegiatanAktif() {
    return prisma.jenisKegiatan.findMany({ where: { aktif: true }, select: { id: true, nama: true }, orderBy: { nama: "asc" } });
  },

  // Pegawai aktif tanpa NIP (NIP tidak dibagikan ke semua role demi privasi)
  pegawaiAktif() {
    return prisma.pegawai.findMany({
      where: { aktif: true },
      select: { id: true, nama: true, jabatan: true, unitKerjaId: true },
      orderBy: { nama: "asc" },
    });
  },

  // Jenis kegiatan aktif berdasarkan id; undefined bila tidak ada/nonaktif
  async findJenisAktif(id: number) {
    return (await prisma.jenisKegiatan.findFirst({ where: { id, aktif: true }, select: { id: true } })) ?? undefined;
  },

  // Pegawai aktif berdasarkan id beserta unit kerjanya; undefined bila tidak ada/nonaktif
  async findPegawaiAktif(id: number) {
    return (await prisma.pegawai.findFirst({ where: { id, aktif: true }, select: { id: true, unitKerjaId: true } })) ?? undefined;
  },
};
