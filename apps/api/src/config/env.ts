// Mengambil environment variable wajib; aplikasi berhenti bila belum diisi
const wajib = (kunci: string): string => {
  const nilai = process.env[kunci];
  if (!nilai) throw new Error(`Environment variable wajib belum diisi: ${kunci}`);
  return nilai;
};

const secret = wajib("BETTER_AUTH_SECRET");
if (secret.length < 32) throw new Error("BETTER_AUTH_SECRET minimal 32 karakter");

// Seluruh konfigurasi aplikasi yang dibaca dari environment (.env)
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
  SMTP_FROM: process.env.SMTP_FROM || "Aplikasi Pendataan Kegiatan <no-reply@diskominfo.local>",
  BREVO_API_KEY: process.env.BREVO_API_KEY || undefined,
  CLOUDINARY_URL: process.env.CLOUDINARY_URL || undefined,
  CLOUDINARY_FOLDER: process.env.CLOUDINARY_FOLDER || "kominfo-kegiatan",
  PENGINGAT_AKTIF: process.env.PENGINGAT_AKTIF !== "false",
} as const;

export const isProduction = env.NODE_ENV === "production";
