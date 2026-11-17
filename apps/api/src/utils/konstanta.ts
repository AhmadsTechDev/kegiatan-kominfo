export const ROLES = ["PEGAWAI", "PIMPINAN", "ADMIN"] as const;

export const STATUS_AKUN = ["MENUNGGU_AKTIVASI", "AKTIF", "NONAKTIF"] as const;

export const TEMA = ["light", "dark", "system"] as const;

export const PENULIS = ["PEGAWAI"] as const;

export const PENGHAPUS_DOKUMENTASI = ["PEGAWAI", "ADMIN"] as const;

export const PEMERIKSA = ["PIMPINAN", "ADMIN"] as const;

export const STATUS_PELAKSANAAN = ["akan_datang", "berlangsung", "selesai", "dibatalkan"] as const;

export const STATUS_PEMERIKSAAN = ["terkirim", "perlu_perbaikan"] as const;

export const STATUS_PERMINTAAN = ["MENUNGGU", "DISETUJUI", "DITOLAK"] as const;

export const SATUAN_REKAP = ["hari", "bulan", "tahun"] as const;
