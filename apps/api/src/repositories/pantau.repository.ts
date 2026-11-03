import { prisma, type Prisma } from "@/lib/prisma";
import type { FilterDaftar } from "@/types/kegiatan.types";
import { kondisiDaftar } from "./kegiatan.repository";

export const PantauRepository = {
  // Jumlah kegiatan per status pemeriksaan (terkirim, diperiksa, perlu_perbaikan)
  async perStatus(f: FilterDaftar, sekarang: Date) {
    const baris = await prisma.kegiatan.groupBy({ by: ["statusPemeriksaan"], where: kondisiDaftar(f, sekarang), _count: { _all: true } });
    return baris.map((b) => ({ status: b.statusPemeriksaan, jumlah: b._count._all }));
  },

  // Jumlah draf yang belum dikirim, bisa dibatasi per pegawai atau per bidang pemiliknya
  jumlahDraf(f: Pick<FilterDaftar, "unitIds" | "pegawaiId">) {
    const pemilik: Prisma.UserWhereInput = {};
    if (f.pegawaiId) pemilik.pegawaiId = f.pegawaiId;
    if (f.unitIds) pemilik.pegawai = { is: { bidangId: { in: f.unitIds } } };
    return prisma.drafKegiatan.count({ where: { pemilik: { is: pemilik } } });
  },
};
