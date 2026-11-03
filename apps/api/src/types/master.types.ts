import type { MasterValidator } from "@/validators/master.validator";

export type IsiUnit = typeof MasterValidator.ubahUnit.static;
export type IsiPegawai = typeof MasterValidator.ubahPegawai.static;
export type IsiPegawaiBaru = typeof MasterValidator.buatPegawai.static;
export type IsiJenis = typeof MasterValidator.ubahJenis.static;
export type DaftarPegawaiQuery = typeof MasterValidator.daftarPegawaiQuery.static;

export type NilaiUnit = { kode: string; nama: string; parentId: number | null; aktif?: boolean };
export type NilaiPegawai = { nip: string | null; nama: string; jabatan: string | null; bidangId: number; aktif?: boolean; roleUndangan?: "PEGAWAI" | "PIMPINAN" };
export type NilaiJenis = { nama: string; aktif?: boolean };

export type FilterPegawai = { q?: string; unitIds?: number[]; aktif?: boolean; tanpaAkun?: boolean };
