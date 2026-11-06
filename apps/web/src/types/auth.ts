// Tipe Role dan label hak akses untuk UI

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
