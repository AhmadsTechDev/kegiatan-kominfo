import type { StatusPelaksanaan } from "@/types/umum.types";

type WaktuKegiatan = { dibatalkanAt: Date | null; tglMulai: Date; tglSelesai: Date };

export function hitungStatus(k: WaktuKegiatan, sekarang: Date): StatusPelaksanaan {
  if (k.dibatalkanAt) return "dibatalkan";
  if (k.tglMulai > sekarang) return "akan_datang";
  if (k.tglSelesai >= sekarang) return "berlangsung";
  return "selesai";
}

export const angka = (nilai: { toString(): string } | null) => (nilai == null ? null : Number(nilai));
