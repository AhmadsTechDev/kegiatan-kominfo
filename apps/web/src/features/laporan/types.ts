// Tipe data pratinjau laporan dan parameter cakupan

export type PratinjauLaporan = {
  kop: { pemerintah: string; dinas: string; alamat: string[] };
  judul: string;
  subjudul: string;
  cakupan: { label: string; nilai: string }[];
  ringkasan: { label: string; nilai: number }[];
  kolom: { judul: string; lebar: string }[];
  baris: {
    id: number;
    judul: string;
    lokasi: string | null;
    jenis: string;
    bidang: string;
    penanggungJawab: string;
    waktu: string;
    peserta: string;
    status: string;
  }[];
  kaki: string;
};

export type CakupanLaporan = { dari: string | null; sampai: string | null; unit: string | null; pegawai: string | null };
