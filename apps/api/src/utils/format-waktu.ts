import type { StatusPelaksanaan } from "@/types/umum.types";
import { geserKeWib } from "./periode";

const ZONA = "Asia/Jakarta";

export const LABEL_STATUS: Record<StatusPelaksanaan, string> = {
  akan_datang: "Akan datang",
  berlangsung: "Berlangsung",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

// Contoh hasil: "05 Mei 2026"
export const formatTanggal = (d: Date) =>
  new Intl.DateTimeFormat("id-ID", { timeZone: ZONA, day: "2-digit", month: "short", year: "numeric" }).format(d);

// Contoh hasil: "14.30"
export const formatJam = (d: Date) =>
  new Intl.DateTimeFormat("id-ID", { timeZone: ZONA, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);

// Contoh hasil: "05 Mei 2026 14.30 WIB"
export const formatWaktu = (d: Date) => `${formatTanggal(d)} ${formatJam(d)} WIB`;

// Rentang waktu kegiatan; bila di hari yang sama cukup tampilkan jamnya
export function formatRentang(mulai: Date, selesai: Date) {
  const a = formatTanggal(mulai);
  const b = formatTanggal(selesai);
  return a === b ? `${a}, ${formatJam(mulai)}–${formatJam(selesai)}` : `${a} – ${b}`;
}

// Mengubah "2026-05" menjadi "Mei 2026"
export function namaBulan(periode: string) {
  const [tahun, bulan] = periode.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(tahun!, bulan! - 1, 1)),
  );
}

// Tanggal WIB berformat "YYYY-MM-DD"
export const tanggalWib = (d: Date) => geserKeWib(d).toISOString().slice(0, 10);
