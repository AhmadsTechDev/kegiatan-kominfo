import type { Role, StatusAkun } from "@/types/auth";

/**
 * Tipe data fitur admin: master data dan akun
 */

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
  bidang: { id: number; nama: string };
  aktif: boolean;
  kontak: string | null;
  /** Role bawaan saat diundang; role sebenarnya ada di akun */
  roleUndangan: Role;
  akun: { id: string; email: string; aktif: boolean } | null;
  updatedAt: string;
};

/**
 * kontak: nomor telepon akun tertaut; hanya dikirim saat mengubah pegawai yang sudah punya akun
 */
export type IsiPegawai = {
  nip: string | null;
  nama: string;
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
      aktif: boolean;
    bidang: { id: number; nama: string; parent: { id: number; nama: string } | null };
  } | null;
  undangan: { kedaluwarsa: string | null } | null;
  sesi: SesiAkun[];
};

/**
 * Isian form Buat/Ubah akun. NIP opsional; bidang wajib (akun selalu tertaut ke data pegawai)
 */
export type IsiAkun = { name: string; email: string; nip: string | null; bidangId: number; role: Role };

export type HasilSimpanAkun = { id: string; undangan: { email: string; galat: string | null } | null };

/**
 * nonaktif: "1" hanya akun nonaktif, "0" menyembunyikannya
 */
export type FilterAkun = { q: string; role: Role | null; status: StatusAkun | null; nonaktif: "1" | "0" | null; page: number };

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
  pegawai: { id: number; nip: string | null; nama: string } | null;
  bidang: string | null;
};

export type IsiUndangan = { email: string; role: Role; bidangId?: number };

