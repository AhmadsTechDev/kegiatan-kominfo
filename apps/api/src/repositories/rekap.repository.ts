import { prisma } from "@/lib/prisma";
import type { FilterDaftar } from "@/types/kegiatan.types";
import { kondisiDaftar } from "./kegiatan.repository";

export const RekapRepository = {
  // Semua kegiatan sesuai filter dengan kolom yang dibutuhkan rekap; penjumlahan dilakukan di service
  barisRekap(f: FilterDaftar, sekarang: Date) {
    return prisma.kegiatan.findMany({
      where: kondisiDaftar(f, sekarang),
      select: {
        unitKerjaId: true,
        tglMulai: true,
        tglSelesai: true,
        dibatalkanAt: true,
        jumlahPeserta: true,
        jenis: { select: { id: true, nama: true } },
        penanggungJawab: { select: { id: true, nama: true, unitKerja: { select: { nama: true } } } },
      },
    });
  },
};
