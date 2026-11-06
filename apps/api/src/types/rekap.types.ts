import type { RekapValidator } from "@/validators/rekap.validator";

export type RekapQuery = typeof RekapValidator.query.static;
export type DokumentasiZipQuery = typeof RekapValidator.dokumentasiZipQuery.static;
export type RekapPeriodeQuery = typeof RekapValidator.rekapQuery.static;

export type Unit = { id: number; parentId: number | null; kode: string; nama: string; aktif: boolean };

export type Jumlah = { total: number; akanDatang: number; berlangsung: number; selesai: number; dibatalkan: number; peserta: number };
