// =============================================================================
// DEFINISI TIPE DATA FITUR ADMINISTRASI
// =============================================================================
// Gunanya: mendefinisikan seluruh tipe data TypeScript yang digunakan pada fitur
// administrasi: master data, pengelolaan akun, audit log, dan impor lembar kerja.
//
// Isi berkas:
//   - JenisUnitAdmin, IsiJenisUnit : tipe hierarki dan formulir jenis unit
//   - UnitKerjaAdmin, IsiUnit : tipe master unit kerja dinas dan formulirnya
//   - PegawaiAdmin, IsiPegawai, IsiPegawaiBaru, FilterPegawai : tipe entitas pegawai
//   - JenisKegiatanAdmin : tipe referensi kategori jenis kegiatan dinas
//   - Halaman<T> : tipe generik pembungkus respons data berpaginasi dari server
//   - AkunAdmin, AkunDetail, IsiAkun, FilterAkun : tipe akun pengguna, detail, form, dan filternya
//   - AuditItem, AuditDetail, FilterAudit, PilihanAudit : tipe riwayat jejak audit
//   - PermintaanAkun, StatusPermintaan, IsiUndangan : tipe permintaan akun dan undangan
//   - StatusImpor, BarisImpor, HasilImpor : tipe hasil impor pegawai dari Excel
//
// Catatan penting:
//   - Menjadi kontrak data bersama antara klien API, hooks query, dan komponen UI.
//   - Tipe Halaman<T> menggunakan generic TypeScript untuk standarisasi paginasi.
//
// Dipakai oleh: api/admin.ts, hooks/use-admin.ts, dan komponen fitur admin
// =============================================================================

import type { Role, StatusAkun } from "@/types/auth";

export type JenisUnitAdmin = {
  id: number;
  nama: string;
  indukJenisId: number | null;
  aktif: boolean;
  jumlahUnit: number;
  jumlahUnitAktif: number;
  updatedAt: string;
};

export type IsiJenisUnit = { nama: string; indukJenisId: number | null; aktif?: boolean };

export type UnitKerjaAdmin = {
  id: number;
  kode: string;
  nama: string;
  jenisUnitId: number;
  jenis: string;
  parentId: number | null;
  induk: string | null;
  aktif: boolean;
  jumlahPegawaiAktif: number;
  updatedAt: string;
};

export type IsiUnit = { kode?: string; nama: string; jenisUnitId: number; parentId: number | null; aktif?: boolean };

export type PegawaiAdmin = {
  id: number;
  nip: string | null;
  nama: string;
  jabatan: string | null;
  unitKerja: { id: number; nama: string };
  aktif: boolean;
  akun: { id: string; email: string; aktif: boolean } | null;
  updatedAt: string;
};

export type IsiPegawai = { nip: string | null; nama: string; jabatan: string | null; unitKerjaId: number; aktif?: boolean };
export type IsiPegawaiBaru = IsiPegawai & { email?: string | null; role?: "PEGAWAI" | "PIMPINAN" };
export type HasilPegawaiBaru = { id: number; undangan: { email: string; galat: string | null } | null };

export type FilterPegawai = { q: string; unit: string | null; aktif: "1" | "0" | null; page: number };

export type JenisKegiatanAdmin = { id: number; nama: string; aktif: boolean; jumlahKegiatan: number; updatedAt: string };

export type Halaman<T> = { items: T[]; total: number; page: number; pageSize: number };

export type AkunAdmin = {
  id: string;
  name: string;
  email: string;
  emailBaru: string | null;
  emailVerified: boolean;
  role: Role;
  status: StatusAkun;
  banned: boolean;
  banReason: string | null;
  pegawaiId: number | null;
  createdAt: string;
  foto: string | null;
  pegawai: {
    id: number;
    nama: string;
    nip: string | null;
    jabatan: string | null;
    unitKerjaId: number;
    unitKerja: string;
    unitInduk: string | null;
  } | null;
  terkunci: boolean;
  bisaDihapus: boolean;
};

export type SesiAkun = { id: string; ipAddress: string | null; userAgent: string | null; createdAt: string; updatedAt: string; expiresAt: string };

export type AkunDetail = Omit<AkunAdmin, "pegawai"> & {
  kontak: string | null;
  updatedAt: string;
  pegawai: {
    id: number;
    nip: string | null;
    nama: string;
    jabatan: string | null;
    aktif: boolean;
    unitKerja: { id: number; nama: string; parent: { id: number; nama: string } | null };
  } | null;
  undangan: { kedaluwarsa: string | null } | null;
  sesi: SesiAkun[];
  riwayat: AuditItem[];
};

// Isian form Buat/Ubah akun. NIP opsional; jabatan dan unit kerja wajib (akun selalu tertaut ke data pegawai)
export type IsiAkun = { name: string; email: string; nip: string | null; jabatan: string; unitKerjaId: number; role: Role };

export type HasilSimpanAkun = { id: string; undangan: { email: string; galat: string | null } | null };

export type FilterAkun = { q: string; role: Role | null; status: StatusAkun | null; page: number };

export type AuditItem = {
  id: number;
  waktu: string;
  aktor: { id: string; nama: string; email: string | null } | null;
  aksi: string;
  entitas: string;
  entitasId: string | null;
  ip: string | null;
};

export type AuditDetail = AuditItem & { dataSebelum: unknown; dataSesudah: unknown; userAgent: string | null };

export type FilterAudit = {
  aktor: string | null;
  aksi: string | null;
  entitas: string | null;
  dari: string | null;
  sampai: string | null;
  page: number;
};

export type PilihanAudit = { aktor: { id: string; nama: string; email: string }[]; entitas: string[]; aksi: string[] };

export type StatusPermintaan = "MENUNGGU" | "DISETUJUI" | "DITOLAK";

export type PermintaanAkun = {
  id: number;
  nama: string;
  email: string;
  catatan: string | null;
  status: StatusPermintaan;
  alasanTolak: string | null;
  diprosesAt: string | null;
  diprosesOleh: string | null;
  createdAt: string;
  pegawai: { id: number; nip: string | null; nama: string; jabatan: string | null } | null;
  unitKerja: string | null;
};

export type IsiUndangan = { email: string; role: Role; unitKerjaId?: number; jabatan?: string | null };

export type StatusImpor = "baru" | "perbarui" | "sama" | "galat";
export type BarisImpor = {
  baris: number;
  nip: string;
  nama: string;
  jabatan: string | null;
  unit: { id: number; nama: string } | null;
  unitTeks: string;
  status: StatusImpor;
  pesan: string[];
};
export type HasilImpor = {
  ringkasan: { total: number } & Record<StatusImpor, number>;
  baris: BarisImpor[];
  disimpan: boolean;
};
