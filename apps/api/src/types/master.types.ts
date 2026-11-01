import type { MasterValidator } from "@/validators/master.validator";

export type IsiUnit = typeof MasterValidator.ubahUnit.static;
export type IsiJenisUnit = typeof MasterValidator.ubahJenisUnit.static;
export type IsiPegawai = typeof MasterValidator.ubahPegawai.static;
export type IsiPegawaiBaru = typeof MasterValidator.buatPegawai.static;
export type IsiJenis = typeof MasterValidator.ubahJenis.static;
export type ImporPegawai = typeof MasterValidator.imporPegawai.static;
export type DaftarPegawaiQuery = typeof MasterValidator.daftarPegawaiQuery.static;

export type NilaiUnit = { kode: string; nama: string; jenisUnitId: number; parentId: number | null; aktif?: boolean };
export type NilaiJenisUnit = { nama: string; indukJenisId: number | null; aktif?: boolean };
export type NilaiPegawai = { nip: string | null; nama: string; jabatan: string | null; unitKerjaId: number; aktif?: boolean };
export type NilaiJenis = { nama: string; aktif?: boolean };

export type JenisUnit = { id: number; nama: string; indukJenisId: number | null; aktif: boolean };

export type FilterPegawai = { q?: string; unitIds?: number[]; aktif?: boolean };

export type StatusImpor = "baru" | "perbarui" | "sama" | "galat";

// Hasil pemeriksaan satu baris Excel impor pegawai
export type BarisImpor = {
  baris: number;
  nip: string;
  nama: string;
  jabatan: string | null;
  unit: { id: number; nama: string } | null;
  unitTeks: string;
  status: StatusImpor;
  pesan: string[];
  pegawaiId: number | null;
};

// Satu baris mentah yang dibaca dari Excel sebelum diperiksa
export type BarisMentah = { baris: number; nip: string; nama: string; jabatan: string; unit: string; galatNip?: string };

export type UnitTemplat = { kode: string; nama: string; induk: string | null };
