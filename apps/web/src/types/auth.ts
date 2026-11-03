// =============================================================================
// TIPE DATA DAN KONSTANTA PERAN PENGGUNA
// =============================================================================
// Gunanya: Mendefinisikan tipe peran pengguna (Role) dan kamus label hak akses UI.
//
// Isi berkas:
//   - Role : Tipe union tiga peran pengguna (PEGAWAI, PIMPINAN, ADMIN).
//   - LABEL_ROLE : Pemetaan label peran (PRD bagian 3, murni untuk antarmuka).
//   - KETERANGAN_ROLE : Deskripsi lengkap peran untuk sidebar dan menu profil.
//   - StatusAkun, LABEL_STATUS_AKUN : status akun dari backend dan labelnya.
//
// Catatan penting:
//   - Nilai PEGAWAI di backend ditampilkan "Pegawai" (pencatat kegiatan bidangnya).
//
// Dipakai oleh: Komponen navigasi, menu profil, dan kendali tampilan berbasis peran
// =============================================================================

export type Role = "PEGAWAI" | "PIMPINAN" | "ADMIN";

export const LABEL_ROLE: Record<Role, string> = {
  PEGAWAI: "Pegawai",
  PIMPINAN: "Pimpinan",
  ADMIN: "Admin",
};

export const KETERANGAN_ROLE: Record<Role, string> = {
  PEGAWAI: "Pegawai pencatat kegiatan",
  PIMPINAN: "Pimpinan",
  ADMIN: "Administrator aplikasi",
};

export type StatusAkun = "MENUNGGU_AKTIVASI" | "AKTIF" | "NONAKTIF";

export const LABEL_STATUS_AKUN: Record<StatusAkun, string> = {
  MENUNGGU_AKTIVASI: "Menunggu aktivasi",
  AKTIF: "Aktif",
  NONAKTIF: "Nonaktif",
};
