// Daftar nilai tetap yang dipakai di validator, service, dan repository

// PEGAWAI adalah role operator (pencatat kegiatan); di antarmuka ditampilkan sebagai "Operator"
export const ROLES = ["PEGAWAI", "PIMPINAN", "ADMIN"] as const;

// Status akun, diturunkan dari kolom banned dan ada-tidaknya kredensial (lihat utils/status-akun.ts)
export const STATUS_AKUN = ["MENUNGGU_AKTIVASI", "AKTIF", "NONAKTIF"] as const;

export const TEMA = ["light", "dark", "system"] as const;

// Role yang boleh membuat/mengubah kegiatan, draf, dan dokumentasi
export const PENULIS = ["PEGAWAI", "ADMIN"] as const;

export const STATUS_PELAKSANAAN = ["akan_datang", "berlangsung", "selesai", "dibatalkan"] as const;

export const STATUS_PEMERIKSAAN = ["terkirim", "diperiksa", "perlu_perbaikan"] as const;

export const STATUS_PERMINTAAN = ["MENUNGGU", "DISETUJUI", "DITOLAK"] as const;

export const SATUAN_REKAP = ["hari", "bulan", "tahun"] as const;

export const AKSI_AUDIT = [
  "login",
  "login_gagal",
  "akun_terkunci",
  "logout",
  "buat",
  "ubah",
  "hapus",
  "batal",
  "unggah",
  "hapus_file",
  "ganti_file",
  "periksa",
  "ekspor",
  "aktifkan",
  "nonaktifkan",
  "reset_sandi",
  "undang",
  "aktivasi",
  "minta_akun",
  "setujui",
  "tolak",
  "minta_reset_sandi",
  "kirim_reset_sandi",
  "ganti_sandi",
  "minta_ganti_email",
  "ganti_email",
  "batal_ganti_email",
  "cabut_sesi",
] as const;
