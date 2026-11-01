// =============================================================================
// TIPE DATA FITUR LAPORAN
// =============================================================================
// Gunanya: Mendefinisikan tipe data TypeScript untuk struktur data pratinjau
// laporan kegiatan dari backend serta parameter cakupan filter pengguna.
//
// Isi berkas:
//   - PratinjauLaporan : kontrak respons GET /ekspor/pratinjau (kop, kolom, baris)
//   - CakupanLaporan   : pilihan filter rentang tanggal, unit kerja, dan pegawai
//
// Dipakai oleh: api.ts, halaman-laporan.tsx, dan laporan-view.tsx
// =============================================================================

export type PratinjauLaporan = {
  kop: { pemerintah: string; dinas: string; alamat: string | null };
  judul: string;
  subjudul: string;
  ringkasan: { label: string; nilai: number }[];
  kolom: { judul: string; lebar: string }[];
  baris: {
    id: number;
    judul: string;
    lokasi: string | null;
    jenis: string;
    unitKerja: string;
    penanggungJawab: string;
    waktu: string;
    peserta: string;
    status: string;
  }[];
  kaki: string;
};

export type CakupanLaporan = { dari: string | null; sampai: string | null; unit: string | null; pegawai: string | null };
