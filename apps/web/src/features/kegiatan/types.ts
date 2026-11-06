import type { StatusPelaksanaan, StatusPemeriksaan } from "@/components/shared/status-badge";

// Tipe data kegiatan, respons API, filter, draf, dan dokumen

export type StatusPemeriksaanKegiatan = Exclude<StatusPemeriksaan, "draf">;
import type { KegiatanFormValues } from "./schemas/kegiatan.schema";

type Ref = { id: number; nama: string };

export type KegiatanItem = {
  id: number;
  judul: string;
  tglMulai: string;
  tglSelesai: string;
  lokasiNama: string | null;
  bidang: Ref;
  jenis: Ref;
  penanggungJawab: Ref;
  statusPelaksanaan: StatusPelaksanaan;
  statusPemeriksaan: StatusPemeriksaanKegiatan;
  updatedAt: string;
  bisaUbah: boolean;
};

export type DaftarKegiatan = { items: KegiatanItem[]; total: number; page: number; pageSize: number };

export type Dokumentasi = { id: number; namaAsli: string; mime: string; ukuran: number; createdAt: string };

export type KegiatanDetail = {
  id: number;
  judul: string;
  uraian: string | null;
  hasil: string | null;
  tglMulai: string;
  tglSelesai: string;
  lokasiNama: string | null;
  lat: number | null;
  lng: number | null;
  jumlahPeserta: number | null;
  refEksternal: string | null;
  dibatalkanAt: string | null;
  alasanBatal: string | null;
  jenis: Ref;
  bidang: Ref;
  unitInduk: Ref | null;
  penanggungJawab: Ref;
  pembuat: { id: string; nama: string };
  statusPelaksanaan: StatusPelaksanaan;
  statusPemeriksaan: StatusPemeriksaanKegiatan;
  catatanPemeriksaan: { id: number; status: StatusPemeriksaanKegiatan; isi: string | null; pemeriksa: string; waktu: string }[];
  bisaPeriksa: boolean;
  createdAt: string;
  updatedAt: string;
  dokumentasi: Dokumentasi[];
  pengubahTerakhir: { nama: string; waktu: string } | null;
  riwayat: { id: number; aksi: string; aktor: string | null; waktu: string }[];
  bisaUbah: boolean;
};

export type Referensi = {
  bidang: { id: number; parentId: number | null; kode: string; nama: string; aktif: boolean }[];
  jenisKegiatan: Ref[];
  pegawai: { id: number; nama: string; bidangId: number }[];
};

export type FilterKegiatan = {
  q: string;
  dari: string | null;
  sampai: string | null;
  unit: string | null;
  jenis: string | null;
  status: StatusPelaksanaan | null;
  pegawai: string | null;
  pemeriksaan?: StatusPemeriksaanKegiatan | null;
  milik: "saya" | null;
  page: number;
};

export type KegiatanPayload = {
  judul: string;
  jenisId: number;
  uraian: string | null;
  penanggungJawabId: number;
  jumlahPeserta: number | null;
  hasil: string | null;
  tglMulai: string;
  tglSelesai: string;
  lokasiNama: string | null;
  lat: number | null;
  lng: number | null;
  refEksternal: string | null;
};

export type HasilSimpan = { id: number; updatedAt: string };

export type IsiDraf = Partial<Omit<KegiatanFormValues, "penanggungJawabId" | "hasil">>;

export type DrafRingkas = { id: number; judul: string | null; tanggalMulai: string | null; updatedAt: string };

export type Draf = { id: number; isi: IsiDraf; updatedAt: string };
