/**
 * Tipe data rekap (FR-08) dan ekspor
 */

export type JumlahStatus = {
  total: number;
  akanDatang: number;
  berlangsung: number;
  selesai: number;
  dibatalkan: number;
  peserta: number;
};

export type SatuanRekap = "hari" | "bulan" | "tahun";

export type RekapData = {
  periodeSekarang: string;
  satuan: SatuanRekap;
  total: JumlahStatus;
  tren: { periode: string; jumlah: number }[];
  perPegawai: { id: number; nama: string; bidang: string; jumlah: number }[];
  perUnit: ({ unit: { id: number; kode: string; nama: string } } & JumlahStatus)[];
  perJenis: { id: number; nama: string; jumlah: number }[];
};

export type FormatEkspor = "pdf";

