import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "@/config/env";
import { Prisma, PrismaClient } from "@/generated/prisma/client";

/**
 * Satu koneksi Prisma yang dipakai bersama oleh seluruh repository
 *
 * KONSEP ORM: Prisma menerjemahkan pemanggilan TypeScript seperti prisma.kegiatan.findMany() menjadi
 * query SQL ke PostgreSQL. PrismaPg adalah "adapter" penghubung ke database lewat driver pg, dan `max`
 * membatasi jumlah koneksi yang dibuka bersamaan (connection pool) agar database tidak kewalahan.
 * Objek ini dibuat sekali lalu dipakai bersama, karena membuat koneksi baru di setiap permintaan itu lambat.
 */
export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: env.DATABASE_URL, max: env.DATABASE_POOL_MAX }),
});

/**
 * Tipe koneksi: bisa prisma biasa atau `tx` di dalam prisma.$transaction(...)
 *
 * KONSEP transaksi: prisma.$transaction(async (tx) => {...}) menjalankan beberapa query sebagai satu kesatuan;
 * bila salah satu gagal, semuanya dibatalkan. Repository menerima parameter bertipe Db supaya
 * fungsinya bisa dipanggil di dalam maupun di luar transaksi.
 */
export type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Mengecek apakah galat berasal dari pelanggaran UNIQUE (kode Prisma P2002)
 */
export function galatDuplikat(e: unknown) {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

export { Prisma };
