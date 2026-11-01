// =============================================================================
// TIPE DATA REKAPITULASI DAN EKSPOR
// =============================================================================
// Gunanya: Mendefinisikan tipe data kontrak rekapitulasi (FR-08) dan ekspor.
//
// Isi berkas:
//   - JumlahStatus & SatuanRekap : status pelaksanaan, peserta, dan satuan waktu
//   - RekapData & FormatEkspor   : kontrak respons rekapitulasi dan format ekspor
//
// Dipakai oleh: api/rekap.ts, use-rekap.ts, dan komponen fitur rekap
// =============================================================================

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
  perPegawai: { id: number; nama: string; unitKerja: string; jumlah: number }[];
  perUnit: ({ unit: { id: number; kode: string; nama: string } } & JumlahStatus)[];
  perJenis: { id: number; nama: string; jumlah: number }[];
};

export type FormatEkspor = "xlsx" | "pdf";

