import type { Rentang } from "@/types/umum.types";

export type Periode = { tahun: number; bulan: number };

const OFFSET_JAKARTA_MS = 7 * 60 * 60 * 1000;

export function periodeSekarang(sekarang = new Date()): Periode {
  const jakarta = new Date(sekarang.getTime() + OFFSET_JAKARTA_MS);
  return { tahun: jakarta.getUTCFullYear(), bulan: jakarta.getUTCMonth() + 1 };
}

export function parsePeriode(nilai: string | undefined, sekarang = new Date()): Periode {
  if (!nilai) return periodeSekarang(sekarang);
  const [tahun, bulan] = nilai.split("-").map(Number);
  return { tahun: tahun!, bulan: bulan! };
}

export function geserPeriode({ tahun, bulan }: Periode, selisih: number): Periode {
  const indeks = tahun * 12 + (bulan - 1) + selisih;
  return { tahun: Math.floor(indeks / 12), bulan: (indeks % 12) + 1 };
}

export function rentangPeriode({ tahun, bulan }: Periode): Rentang {
  const mulai = new Date(Date.UTC(tahun, bulan - 1, 1) - OFFSET_JAKARTA_MS);
  const akhir = new Date(Date.UTC(tahun, bulan, 1) - OFFSET_JAKARTA_MS);
  return { mulai, akhir };
}

export function awalHariJakarta(tanggal: string, selisihHari = 0) {
  const [tahun, bulan, hari] = tanggal.split("-").map(Number);
  return new Date(Date.UTC(tahun!, bulan! - 1, hari! + selisihHari) - OFFSET_JAKARTA_MS);
}

export function tanggalJakarta(sekarang = new Date()) {
  return new Date(sekarang.getTime() + OFFSET_JAKARTA_MS).toISOString().slice(0, 10);
}

export const geserKeWib = (d: Date) => new Date(d.getTime() + OFFSET_JAKARTA_MS);

export function kodePeriode({ tahun, bulan }: Periode) {
  return `${tahun}-${String(bulan).padStart(2, "0")}`;
}
