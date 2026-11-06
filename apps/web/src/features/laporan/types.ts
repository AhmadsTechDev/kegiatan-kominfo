// Tipe data pratinjau laporan dan parameter cakupan

export type PratinjauLaporan = {
  kop: { pemerintah: string; dinas: string; alamat: string[] };
  judul: string;
  subjudul: string;
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
  }[];
};

// Kegiatan beserta berkas dokumentasinya (tab Dokumentasi)
export type KegiatanDokumentasi = {
  id: number;
  judul: string;
  lokasi: string | null;
  jenis: string;
  bidang: string;
  penanggungJawab: string;
  waktu: string;
  dokumentasi: { id: number; namaAsli: string; mime: string; ukuran: number; createdAt: string }[];
};

export type CakupanLaporan = { dari: string | null; sampai: string | null; unit: string | null; pegawai: string | null };
