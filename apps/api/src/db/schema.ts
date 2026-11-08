import {
  boolean,
  char,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import type { IsiDraf } from "@/types/draf-kegiatan.types";

/**
 * Skema basis data untuk Drizzle ORM. Setiap pgTable mewakili satu tabel PostgreSQL:
 * kunci objek (mis. emailVerified) dipakai di kode TypeScript, teks di dalamnya (mis. "email_verified") adalah nama kolom asli.
 *
 * Perubahan struktur: ubah file ini, lalu `bun run db:generate` untuk membuat file migrasi SQL baru di folder drizzle/.
 */

/**
 * Kolom waktu standar: timestamp dengan zona waktu, presisi milidetik
 */
const waktu = (nama: string) => timestamp(nama, { withTimezone: true, precision: 3 });

/**
 * created_at otomatis saat baris dibuat
 */
const dibuatPada = () => waktu("created_at").notNull().defaultNow();

/**
 * updated_at otomatis saat baris dibuat dan diperbarui oleh aplikasi
 */
const diubahPada = () =>
  waktu("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

/**
 * Kunci utama angka yang bertambah otomatis
 */
const idAngka = () => integer("id").primaryKey().generatedByDefaultAsIdentity();

export const statusPermintaan = pgEnum("status_permintaan", ["MENUNGGU", "DISETUJUI", "DITOLAK"]);
export const jenisPengingat = pgEnum("jenis_pengingat", ["H_MINUS_1", "DOKUMENTASI"]);
export type JenisPengingat = (typeof jenisPengingat.enumValues)[number];

/**
 * Autentikasi (dipakai Better Auth). Login hanya dengan email; NIP disimpan di pegawai.
 * Status akun diturunkan, tidak disimpan: MENUNGGU_AKTIVASI (belum punya kredensial), AKTIF, NONAKTIF (banned).
 * Token aktivasi, reset sandi, dan ganti email disimpan di tabel verification sebagai hash SHA-256 (lihat utils/token.ts).
 */
export const user = pgTable("user", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 150 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique("user_email_unique"),
  emailVerified: boolean("email_verified").notNull().default(false),
  /** Email baru yang menunggu diverifikasi; email lama tetap dipakai sampai verifikasi selesai */
  emailBaru: varchar("email_baru", { length: 255 }),
  image: text("image"),
  createdAt: dibuatPada(),
  updatedAt: diubahPada(),
  role: varchar("role", { length: 20 }).notNull().default("PEGAWAI"),
  banned: boolean("banned").notNull().default(false),
  banReason: text("ban_reason"),
  banExpires: waktu("ban_expires"),
  pegawaiId: integer("pegawai_id").references((): AnyPgColumn => pegawai.id, { onDelete: "set null" }),
  kontak: varchar("kontak", { length: 50 }),
  failedLoginCount: integer("failed_login_count").notNull().default(0),
  lockedUntil: waktu("locked_until"),
});

/**
 * Preferensi tampilan dan notifikasi, terpisah dari data autentikasi. Baris dibuat saat pertama diubah.
 */
export const preferensiPengguna = pgTable("preferensi_pengguna", {
  userId: varchar("user_id", { length: 36 })
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  tema: varchar("tema", { length: 10 }).notNull().default("system"),
  notifPengingatKegiatan: boolean("notif_pengingat_kegiatan").notNull().default(true),
  notifPengingatDokumentasi: boolean("notif_pengingat_dokumentasi").notNull().default(true),
  updatedAt: diubahPada(),
});

export const session = pgTable(
  "session",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    expiresAt: waktu("expires_at").notNull(),
    token: varchar("token", { length: 255 }).notNull().unique("session_token_unique"),
    createdAt: dibuatPada(),
    updatedAt: diubahPada(),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    impersonatedBy: varchar("impersonated_by", { length: 36 }),
  },
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    accountId: varchar("account_id", { length: 255 }).notNull(),
    providerId: varchar("provider_id", { length: 50 }).notNull(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: waktu("access_token_expires_at"),
    refreshTokenExpiresAt: waktu("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: dibuatPada(),
    updatedAt: diubahPada(),
  },
  (t) => [index("account_user_id_idx").on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    identifier: varchar("identifier", { length: 255 }).notNull(),
    value: text("value").notNull(),
    expiresAt: waktu("expires_at").notNull(),
    createdAt: dibuatPada(),
    updatedAt: diubahPada(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

/**
 * Bidang dan sub bidang dalam satu tabel. Tanpa induk berarti bidang, dengan induk berarti sub bidang (maksimal dua tingkat).
 * Data master dinonaktifkan lewat kolom aktif; bidang yang belum dipakai boleh dihapus.
 */
export const bidang = pgTable(
  "bidang",
  {
    id: idAngka(),
    parentId: integer("parent_id").references((): AnyPgColumn => bidang.id, { onDelete: "restrict" }),
    kode: varchar("kode", { length: 30 }).notNull().unique("bidang_kode_unique"),
    nama: varchar("nama", { length: 150 }).notNull(),
    aktif: boolean("aktif").notNull().default(true),
    createdAt: dibuatPada(),
    updatedAt: diubahPada(),
  },
  (t) => [index("bidang_parent_id_idx").on(t.parentId)],
);

export const pegawai = pgTable(
  "pegawai",
  {
    id: idAngka(),
    nip: varchar("nip", { length: 18 }).unique("pegawai_nip_unique"),
    nama: varchar("nama", { length: 150 }).notNull(),
    bidangId: integer("bidang_id")
      .notNull()
      .references(() => bidang.id, { onDelete: "restrict" }),
    aktif: boolean("aktif").notNull().default(true),
    /** Role bawaan saat pegawai diundang (PEGAWAI, PIMPINAN, atau ADMIN); role sebenarnya ada di akun */
    roleUndangan: varchar("role_undangan", { length: 20 }).notNull().default("PEGAWAI"),
    createdAt: dibuatPada(),
    updatedAt: diubahPada(),
  },
  (t) => [index("pegawai_bidang_id_idx").on(t.bidangId)],
);

export const jenisKegiatan = pgTable("jenis_kegiatan", {
  id: idAngka(),
  nama: varchar("nama", { length: 100 }).notNull().unique("jenis_kegiatan_nama_unique"),
  aktif: boolean("aktif").notNull().default(true),
  createdAt: dibuatPada(),
  updatedAt: diubahPada(),
});

/**
 * Kegiatan dan turunannya. Waktu disimpan UTC (timestamptz). updatedAt dipakai sebagai "versi" untuk deteksi bentrok ubah (HTTP 409).
 */
export const kegiatan = pgTable(
  "kegiatan",
  {
    id: idAngka(),
    judul: varchar("judul", { length: 200 }).notNull(),
    jenisId: integer("jenis_id")
      .notNull()
      .references(() => jenisKegiatan.id, { onDelete: "restrict" }),
    uraian: text("uraian"),
    lokasiNama: varchar("lokasi_nama", { length: 255 }),
    lat: numeric("lat", { precision: 9, scale: 6 }),
    lng: numeric("lng", { precision: 9, scale: 6 }),
    tglMulai: timestamp("tgl_mulai", { withTimezone: true, precision: 6 }).notNull(),
    tglSelesai: timestamp("tgl_selesai", { withTimezone: true, precision: 6 }).notNull(),
    bidangId: integer("bidang_id")
      .notNull()
      .references(() => bidang.id, { onDelete: "restrict" }),
    penanggungJawabId: integer("penanggung_jawab_id")
      .notNull()
      .references(() => pegawai.id, { onDelete: "restrict" }),
    dibuatOleh: varchar("dibuat_oleh", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    jumlahPeserta: integer("jumlah_peserta"),
    hasil: text("hasil"),
    dibatalkanAt: waktu("dibatalkan_at"),
    alasanBatal: text("alasan_batal"),
    refEksternal: varchar("ref_eksternal", { length: 255 }),
    statusPemeriksaan: varchar("status_pemeriksaan", { length: 20 }).notNull().default("terkirim"),
    createdAt: dibuatPada(),
    updatedAt: diubahPada(),
    deletedAt: waktu("deleted_at"),
  },
  (t) => [
    index("kegiatan_bidang_tgl_mulai_idx").on(t.bidangId, t.tglMulai),
    index("kegiatan_tgl_mulai_idx").on(t.tglMulai),
    index("kegiatan_deleted_at_idx").on(t.deletedAt),
    index("kegiatan_status_pemeriksaan_idx").on(t.statusPemeriksaan),
  ],
);

export const catatanPemeriksaan = pgTable(
  "catatan_pemeriksaan",
  {
    id: idAngka(),
    kegiatanId: integer("kegiatan_id")
      .notNull()
      .references(() => kegiatan.id, { onDelete: "cascade" }),
    pemeriksaId: varchar("pemeriksa_id", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    status: varchar("status", { length: 20 }).notNull(),
    isi: text("isi"),
    createdAt: dibuatPada(),
  },
  (t) => [index("catatan_pemeriksaan_kegiatan_id_idx").on(t.kegiatanId)],
);

export const dokumentasi = pgTable(
  "dokumentasi",
  {
    id: idAngka(),
    kegiatanId: integer("kegiatan_id")
      .notNull()
      .references(() => kegiatan.id, { onDelete: "cascade" }),
    path: varchar("path", { length: 255 }).notNull(),
    namaAsli: varchar("nama_asli", { length: 255 }).notNull(),
    mime: varchar("mime", { length: 50 }).notNull(),
    ukuran: integer("ukuran").notNull(),
    sha256: char("sha256", { length: 64 }).notNull(),
    diunggahOleh: varchar("diunggah_oleh", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: dibuatPada(),
  },
  (t) => [index("dokumentasi_kegiatan_id_idx").on(t.kegiatanId)],
);

export const drafKegiatan = pgTable(
  "draf_kegiatan",
  {
    id: idAngka(),
    pemilikId: varchar("pemilik_id", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    isi: jsonb("isi").$type<IsiDraf>().notNull(),
    createdAt: dibuatPada(),
    updatedAt: diubahPada(),
  },
  (t) => [index("draf_kegiatan_pemilik_id_idx").on(t.pemilikId)],
);

export const permintaanAkun = pgTable(
  "permintaan_akun",
  {
    id: idAngka(),
    pegawaiId: integer("pegawai_id").references(() => pegawai.id, { onDelete: "restrict" }),
    nama: varchar("nama", { length: 150 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    catatan: text("catatan"),
    status: statusPermintaan("status").notNull().default("MENUNGGU"),
    alasanTolak: text("alasan_tolak"),
    diprosesOleh: varchar("diproses_oleh", { length: 36 }).references(() => user.id, { onDelete: "set null" }),
    diprosesAt: waktu("diproses_at"),
    ip: varchar("ip", { length: 45 }),
    createdAt: dibuatPada(),
    updatedAt: diubahPada(),
  },
  (t) => [index("permintaan_akun_status_idx").on(t.status), index("permintaan_akun_pegawai_id_idx").on(t.pegawaiId)],
);

export const pengingat = pgTable(
  "pengingat",
  {
    id: idAngka(),
    kegiatanId: integer("kegiatan_id")
      .notNull()
      .references(() => kegiatan.id, { onDelete: "cascade" }),
    jenis: jenisPengingat("jenis").notNull(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    dikirimAt: dibuatPada(),
  },
  (t) => [unique("pengingat_kegiatan_jenis_user_uq").on(t.kegiatanId, t.jenis, t.userId), index("pengingat_user_id_idx").on(t.userId)],
);

/**
 * Notifikasi dalam aplikasi (ikon lonceng). Saat ini dibuat ketika pimpinan/admin memeriksa kegiatan.
 */
export const notifikasi = pgTable(
  "notifikasi",
  {
    id: idAngka(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    jenis: varchar("jenis", { length: 30 }).notNull(),
    judul: varchar("judul", { length: 200 }).notNull(),
    isi: text("isi"),
    kegiatanId: integer("kegiatan_id").references(() => kegiatan.id, { onDelete: "cascade" }),
    dibacaAt: waktu("dibaca_at"),
    createdAt: dibuatPada(),
  },
  (t) => [index("notifikasi_user_id_created_at_idx").on(t.userId, t.createdAt)],
);
