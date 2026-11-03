// =============================================================================
// DEFINISI TIPE DATA FITUR ADMINISTRASI
// =============================================================================
// Gunanya: mendefinisikan seluruh tipe data TypeScript yang digunakan pada fitur
// administrasi: master data, pengelolaan akun, audit log.
//
// Isi berkas:
//   - BidangAdmin, IsiUnit : tipe master bidang dan sub bidang beserta formulirnya
//   - PegawaiAdmin, IsiPegawai, IsiPegawaiBaru, FilterPegawai : tipe entitas pegawai
//   - JenisKegiatanAdmin : tipe referensi kategori jenis kegiatan dinas
//   - Halaman<T> : tipe generik pembungkus respons data berpaginasi dari server
//   - AkunAdmin, AkunDetail, IsiAkun, FilterAkun : tipe akun pengguna, detail, form, dan filternya
//   - AuditItem, AuditDetail, FilterAudit, PilihanAudit : tipe riwayat jejak audit
//   - PermintaanAkun, StatusPermintaan, IsiUndangan : tipe permintaan akun dan undangan
//
// Catatan penting:
//   - Menjadi kontrak data bersama antara klien API, hooks query, dan komponen UI.
//   - Tipe Halaman<T> menggunakan generic TypeScript untuk standarisasi paginasi.
//
// Dipakai oleh: api/admin.ts, hooks/use-admin.ts, dan komponen fitur admin
// =============================================================================

import type { Role, StatusAkun } from "@/types/auth";

export type BidangAdmin = {
  id: number;
  kode: string;
  nama: string;
  jenis: string;
  parentId: number | null;
  induk: string | null;
  aktif: boolean;
  jumlahPegawaiAktif: number;
  /** true bila belum punya pegawai, kegiatan, atau sub bidang */
  bisaDihapus: boolean;
  updatedAt: string;
};

export type IsiUnit = { kode?: string; nama: string; parentId: number | null; aktif?: boolean };

export type PegawaiAdmin = {
  id: number;
  nip: string | null;
  nama: string;
  jabatan: string | null;
  bidang: { id: number; nama: string };
  aktif: boolean;
  kontak: string | null;
  /** Role bawaan saat diundang; role sebenarnya ada di akun */
  roleUndangan: Role;
  akun: { id: string; email: string; aktif: boolean } | null;
  updatedAt: string;
};

// kontak: nomor telepon akun tertaut; hanya dikirim saat mengubah pegawai yang sudah punya akun
export type IsiPegawai = {
  nip: string | null;
  nama: string;
  jabatan: string | null;
  bidangId: number;
  aktif?: boolean;
  kontak?: string | null;
  roleUndangan?: Role;
};
export type IsiPegawaiBaru = IsiPegawai & { email?: string | null; role?: "PEGAWAI" | "PIMPINAN" };
export type HasilPegawaiBaru = { id: number; undangan: { email: string; galat: string | null } | null };

export type FilterPegawai = { q: string; unit: string | null; aktif: "1" | "0" | null; akun?: "tanpa" | "ada" | null; page: number };

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
    bidangId: number;
    bidang: string;
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
    bidang: { id: number; nama: string; parent: { id: number; nama: string } | null };
  } | null;
  undangan: { kedaluwarsa: string | null } | null;
  sesi: SesiAkun[];
  riwayat: AuditItem[];
};

// Isian form Buat/Ubah akun. NIP opsional; jabatan dan bidang wajib (akun selalu tertaut ke data pegawai)
export type IsiAkun = { name: string; email: string; nip: string | null; jabatan: string; bidangId: number; role: Role };

export type HasilSimpanAkun = { id: string; undangan: { email: string; galat: string | null } | null };

// nonaktif: "1" hanya akun nonaktif, "0" menyembunyikannya
export type FilterAkun = { q: string; role: Role | null; status: StatusAkun | null; nonaktif: "1" | "0" | null; page: number };

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
  bidang: string | null;
};

export type IsiUndangan = { email: string; role: Role; bidangId?: number; jabatan?: string | null };

