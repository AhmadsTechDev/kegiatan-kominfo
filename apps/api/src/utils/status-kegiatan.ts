import type { StatusPelaksanaan } from "@/types/umum.types";

type WaktuKegiatan = { dibatalkanAt: Date | null; tglMulai: Date; tglSelesai: Date };

/**
 * Menghitung status pelaksanaan kegiatan berdasarkan waktu sekarang
 *
 * Status tidak disimpan di database karena berubah sendiri seiring waktu (akan datang -> berlangsung -> selesai).
 * Menghitungnya setiap kali dibutuhkan menjamin status selalu cocok dengan waktu kegiatan.
 * Urutan pengecekan penting: pembatalan selalu menang, lalu dibandingkan dengan waktu mulai dan selesai.
 * @param k waktu batal, mulai, dan selesai kegiatan
 * @param sekarang waktu acuan
 * @returns "dibatalkan", "akan_datang", "berlangsung", atau "selesai"
 */
export function hitungStatus(k: WaktuKegiatan, sekarang: Date): StatusPelaksanaan {
  if (k.dibatalkanAt) return "dibatalkan";
  if (k.tglMulai > sekarang) return "akan_datang";
  if (k.tglSelesai >= sekarang) return "berlangsung";
  return "selesai";
}

/**
 * Mengubah nilai Decimal Prisma (lat/lng) menjadi number biasa
 */
export const angka = (nilai: { toString(): string } | null) => (nilai == null ? null : Number(nilai));
