import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "@/config/env";
import { Prisma, PrismaClient } from "@/generated/prisma/client";

// Satu koneksi Prisma yang dipakai bersama oleh seluruh repository
export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: env.DATABASE_URL, max: env.DATABASE_POOL_MAX }),
});

// Tipe koneksi: bisa prisma biasa atau `tx` di dalam prisma.$transaction(...)
export type Db = PrismaClient | Prisma.TransactionClient;

// Mengecek apakah galat berasal dari pelanggaran UNIQUE (kode Prisma P2002)
export function galatDuplikat(e: unknown) {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

export { Prisma };
