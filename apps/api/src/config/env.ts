/**
 * Mengambil environment variable wajib; aplikasi berhenti bila belum diisi
 *
 * KONSEP environment variable: pengaturan yang dibaca dari luar kode (file .env atau server),
 * misalnya alamat database dan kunci rahasia. Dengan begitu kode yang sama bisa dipakai di laptop dan di server
 * tanpa diubah, dan rahasia tidak ikut tersimpan di Git.
 * Fungsi `wajib` sengaja menghentikan aplikasi sejak awal bila ada pengaturan penting yang kosong,
 * supaya kesalahan konfigurasi langsung ketahuan, bukan baru muncul saat fitur tertentu dipakai.
 */
const wajib = (kunci: string): string => {
  const nilai = process.env[kunci];
  if (!nilai) throw new Error(`Environment variable wajib belum diisi: ${kunci}`);
  return nilai;
};

const secret = wajib("BETTER_AUTH_SECRET");

/**
 * Kunci rahasia dipakai untuk menandatangani cookie sesi; kunci yang terlalu pendek mudah ditebak.
 */
if (secret.length < 32) throw new Error("BETTER_AUTH_SECRET minimal 32 karakter");

/**
 * Seluruh konfigurasi aplikasi yang dibaca dari environment (.env)
 *
 * `process.env.X ?? nilai` dan `process.env.X || nilai` berarti: pakai nilai bawaan bila X tidak diisi.
 * `as const` membuat objek ini hanya-baca, sehingga tidak ada kode yang tidak sengaja mengubah konfigurasi.
 */
export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: Number(process.env.PORT ?? 3001),
  DATABASE_URL: wajib("DATABASE_URL"),
  DATABASE_POOL_MAX: Number(process.env.DATABASE_POOL_MAX || 10),
  BETTER_AUTH_SECRET: secret,
  BETTER_AUTH_URL: wajib("BETTER_AUTH_URL"),
  FRONTEND_URL: wajib("FRONTEND_URL"),
  STORAGE_DIR: process.env.STORAGE_DIR || "./storage",
  SMTP_HOST: process.env.SMTP_HOST || "localhost",
  SMTP_PORT: Number(process.env.SMTP_PORT || 1025),
  SMTP_SECURE: process.env.SMTP_SECURE === "true",
  SMTP_USER: process.env.SMTP_USER || undefined,
  SMTP_PASS: process.env.SMTP_PASS || undefined,
  SMTP_FROM: process.env.SMTP_FROM || "Pendataan Kegiatan <no-reply@diskominfo.local>",
  BREVO_API_KEY: process.env.BREVO_API_KEY || undefined,
  CLOUDINARY_URL: process.env.CLOUDINARY_URL || undefined,
  CLOUDINARY_FOLDER: process.env.CLOUDINARY_FOLDER || "kominfo-kegiatan",

  /**
   * Pengingat email menyala kecuali .env berisi PENGINGAT_AKTIF=false.
   */
  PENGINGAT_AKTIF: process.env.PENGINGAT_AKTIF !== "false",
} as const;

export const isProduction = env.NODE_ENV === "production";
