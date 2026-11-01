import type { StatusPelaksanaan } from "@/types/umum.types";

type WaktuKegiatan = { dibatalkanAt: Date | null; tglMulai: Date; tglSelesai: Date };

// Menghitung status pelaksanaan kegiatan berdasarkan waktu sekarang
export function hitungStatus(k: WaktuKegiatan, sekarang: Date): StatusPelaksanaan {
  if (k.dibatalkanAt) return "dibatalkan";
  if (k.tglMulai > sekarang) return "akan_datang";
  if (k.tglSelesai >= sekarang) return "berlangsung";
  return "selesai";
}

// Mengubah nilai Decimal Prisma (lat/lng) menjadi number biasa
export const angka = (nilai: { toString(): string } | null) => (nilai == null ? null : Number(nilai));
