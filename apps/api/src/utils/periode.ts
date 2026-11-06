import type { Rentang } from "@/types/umum.types";

/**
 * KONSEP zona waktu: database dan JavaScript menyimpan waktu dalam UTC. WIB = UTC + 7 jam.
 * Untuk mengetahui tanggal/bulan menurut WIB, waktu digeser +7 jam lalu dibaca dengan fungsi getUTC*.
 * Sebaliknya, "00:00 WIB" dalam UTC adalah 17:00 hari sebelumnya, jadi offset dikurangkan.
 */
const OFFSET_JAKARTA_MS = 7 * 60 * 60 * 1000;

export type Periode = { tahun: number; bulan: number };

/**
 * Bulan berjalan menurut jam WIB
 */
export function periodeSekarang(sekarang = new Date()): Periode {
  const jakarta = new Date(sekarang.getTime() + OFFSET_JAKARTA_MS);
  return { tahun: jakarta.getUTCFullYear(), bulan: jakarta.getUTCMonth() + 1 };
}

/**
 * Mengubah teks "YYYY-MM" menjadi Periode; kosong berarti bulan berjalan
 */
export function parsePeriode(nilai: string | undefined, sekarang = new Date()): Periode {
  if (!nilai) return periodeSekarang(sekarang);
  const [tahun, bulan] = nilai.split("-").map(Number);
  return { tahun: tahun!, bulan: bulan! };
}

/**
 * Menggeser periode sejumlah bulan (negatif = mundur)
 * Trik menghitung bulan: ubah ke "indeks bulan" (tahun x 12 + bulan), tambah selisihnya, lalu kembalikan ke tahun dan bulan. Pergantian tahun otomatis tertangani.
 */
export function geserPeriode({ tahun, bulan }: Periode, selisih: number): Periode {
  const indeks = tahun * 12 + (bulan - 1) + selisih;
  return { tahun: Math.floor(indeks / 12), bulan: (indeks % 12) + 1 };
}

/**
 * Rentang waktu UTC dari awal sampai akhir satu bulan WIB
 * Date.UTC(tahun, bulan, 1) adalah tanggal 1 bulan BERIKUTNYA (bulan di JavaScript dihitung dari 0), dipakai sebagai batas akhir yang tidak ikut terhitung.
 */
export function rentangPeriode({ tahun, bulan }: Periode): Rentang {
  const mulai = new Date(Date.UTC(tahun, bulan - 1, 1) - OFFSET_JAKARTA_MS);
  const akhir = new Date(Date.UTC(tahun, bulan, 1) - OFFSET_JAKARTA_MS);
  return { mulai, akhir };
}

/**
 * Waktu pukul 00:00 WIB untuk tanggal "YYYY-MM-DD" (bisa digeser beberapa hari)
 */
export function awalHariJakarta(tanggal: string, selisihHari = 0) {
  const [tahun, bulan, hari] = tanggal.split("-").map(Number);
  return new Date(Date.UTC(tahun!, bulan! - 1, hari! + selisihHari) - OFFSET_JAKARTA_MS);
}

/**
 * Tanggal hari ini menurut WIB dalam format "YYYY-MM-DD"
 */
export function tanggalJakarta(sekarang = new Date()) {
  return new Date(sekarang.getTime() + OFFSET_JAKARTA_MS).toISOString().slice(0, 10);
}

/**
 * Menggeser waktu ke WIB (untuk mengambil tanggal/jam WIB lewat toISOString)
 */
export const geserKeWib = (d: Date) => new Date(d.getTime() + OFFSET_JAKARTA_MS);

/**
 * Mengubah Periode menjadi teks "YYYY-MM"
 */
export function kodePeriode({ tahun, bulan }: Periode) {
  return `${tahun}-${String(bulan).padStart(2, "0")}`;
}
