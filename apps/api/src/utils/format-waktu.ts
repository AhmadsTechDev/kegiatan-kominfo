import type { StatusPelaksanaan } from "@/types/umum.types";
import { geserKeWib } from "./periode";

const ZONA = "Asia/Jakarta";

export const LABEL_STATUS: Record<StatusPelaksanaan, string> = {
  akan_datang: "Akan datang",
  berlangsung: "Berlangsung",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

export const formatTanggal = (d: Date) =>
  new Intl.DateTimeFormat("id-ID", { timeZone: ZONA, day: "numeric", month: "short", year: "numeric" }).format(d);

export const formatTanggalPanjang = (d: Date) =>
  new Intl.DateTimeFormat("id-ID", { timeZone: ZONA, day: "numeric", month: "long", year: "numeric" }).format(d);

export const formatJam = (d: Date) =>
  new Intl.DateTimeFormat("id-ID", { timeZone: ZONA, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);

export const formatWaktu = (d: Date) => `${formatTanggal(d)} ${formatJam(d)} WIB`;

export function formatRentang(mulai: Date, selesai: Date) {
  const a = formatTanggal(mulai);
  const b = formatTanggal(selesai);
  return a === b
    ? `${a}, ${formatJam(mulai)}–${formatJam(selesai)} WIB`
    : `${a} ${formatJam(mulai)} – ${b} ${formatJam(selesai)} WIB`;
}

export function namaBulan(periode: string) {
  const [tahun, bulan] = periode.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(tahun!, bulan! - 1, 1)),
  );
}

export const tanggalWib = (d: Date) => geserKeWib(d).toISOString().slice(0, 10);
